Ext.define('Rally.example.BurnCalculator', {
                extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
                config: {
                    completedScheduleStateNames: ['Accepted']
                },
            
                constructor: function(config) {
                    this.initConfig(config);
                    this.callParent(arguments);
                },
            
                getDerivedFieldsOnInput: function() {
                    var completedScheduleStateNames = this.getCompletedScheduleStateNames();
                    return [
                        {
                            "as": "Planned",
                            "f": function(snapshot) {
                                if (snapshot.PlanEstimate) {
                                    return snapshot.PlanEstimate;
                                }
            
                                return 0;
                            }
                        },
                        {
                            "as": "PlannedCompleted",
                            "f": function(snapshot) {
                                if (_.contains(completedScheduleStateNames, snapshot.ScheduleState) && snapshot.PlanEstimate) {
                                    return snapshot.PlanEstimate;
                                }
            
                                return 0;
                            }
                        }
                    ];
                },
            
                getMetrics: function() {
                    return [
                        {
                            "field": "Planned",
                            "as": "Planned",
                            "display": "line",
                            "f": "sum"
                        },
                        {
                            "field": "PlannedCompleted",
                            "as": "Completed",
                            "f": "sum",
                            "display": "column"
                        }
                    ];
                }
            });
            
            var PI_OID = 12483739639; //The ObjectID of the PI on which to burn
            
            Ext.define('Rally.example.BurnChart', {
                extend: 'Rally.app.App',
            
                requires: [
                    'Rally.example.BurnCalculator'
                ],
            
                launch: function() {
                    this.add({
                        xtype: 'rallychart',
                        storeType: 'Rally.data.lookback.SnapshotStore',
                        storeConfig: this._getStoreConfig(),
                        calculatorType: 'Rally.example.BurnCalculator',
                        calculatorConfig: {
                            completedScheduleStateNames: ['Accepted', 'Released']
                        },
                        chartConfig: this._getChartConfig(),
                        listeners:{
                                chartRendered: this._getStats,
                                scope:  this
                            }
                    });
                },
            
                /**
                 * Generate the store config to retrieve all snapshots for all leaf child stories of the specified PI
                 */
                _getStoreConfig: function() {
                    return {
                        find: {
                            _ItemHierarchy: PI_OID,
                            _TypeHierarchy: 'HierarchicalRequirement',
                            Children: null
                        },
                        fetch: ['ScheduleState', 'PlanEstimate'],
                        hydrate: ['ScheduleState'],
                        sort: {
                            _ValidFrom: 1
                        },
                        context: this.getContext().getDataContext(),
                        limit: Infinity
                    };
                },
            
                /**
                 * Generate a valid Highcharts configuration object to specify the chart
                 */
                _getChartConfig: function() {
                    return {
                        chart: {
                            defaultSeriesType: 'area',
                            zoomType: 'xy'
                        },
                        title: {
                            text: 'PI Burnup'
                        },
                        xAxis: {
                            categories: [],
                            tickmarkPlacement: 'on',
                            tickInterval: 5,
                            title: {
                                text: 'Date',
                                margin: 10
                            }
                        },
                        yAxis: [
                            {
                                title: {
                                    text: 'Points'
                                }
                            }
                        ],
                        tooltip: {
                            formatter: function() {
                                return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
                            }
                        },
                        plotOptions: {
                            series: {
                                marker: {
                                    enabled: false,
                                    states: {
                                        hover: {
                                            enabled: true
                                        }
                                    }
                                },
                                groupPadding: 0.01
                            },
                            column: {
                                stacking: null,
                                shadow: false
                            }
                        }
                    };
                },
                _getStats:function(chart){
                    var stats = [];
                    console.log(chart);
                    var series = chart.chartData.series;
                    _.each(series, function(s){
                        stats.push({
                            name    : s.name,
                            average : Ext.Number.toFixed(Ext.Array.mean(s.data), 2),
                            min     : Ext.Array.min(s.data),
                            max     : Ext.Array.max(s.data),
                            count   : Ext.Array.sum(s.data)
                        });
                    });
                    this._showStats(stats);
                },
                
                _showStats: function(stats) {
                    console.log(stats);
                    this.add({
                        xtype: 'rallygrid',
                        store: Ext.create('Rally.data.custom.Store', {
                            data: stats
                        }),
                        columnCfgs: [
                            {
                                text: 'Name',
                                dataIndex: 'name'
                            },
                            {
                                text: 'Average',
                                dataIndex: 'average'
                            },
                            {
                                text: 'Min',
                                dataIndex: 'min'
                            },
                            {
                                text: 'Max',
                                dataIndex: 'max'
                            },
                            {
                                text: 'Count',
                                dataIndex: 'count'
                            }
                        ]
                    });
                }
            });