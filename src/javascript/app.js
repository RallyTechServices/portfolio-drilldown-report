Ext.define("portfolio-drilldown-report", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'criteria_box', layout: {type: 'hbox'}},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    portfolioItemTypes: ['PortfolioItem/Feature','PortfolioItem/Initiative'],
    launch: function() {

        this.down('#criteria_box').add({
            itemId: 'cb-release',
            xtype: 'rallyreleasecombobox',
            allowNoEntry: true,
            listeners: {
                change: this._onReleaseChanged,
                scope: this
            }
        });

        this.down('#criteria_box').add({
            xtype: 'rallybutton',
            text: 'Portfolio Items...',
            listeners: {
                scope: this,
                click: this._launchChooser
            }
        });
    },
    _onReleaseChanged: function(cb){
        var grid = this.down('rallygridboard');
        if (grid){
            grid.getGridOrBoard().store.filterChildren(this._getChildFilter(cb));
            this._expandNodes(grid);
        }
    },
    _getChildFilter: function(cb){
        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: 'Release',
            value: ""
        });
        if (cb.getValue() && cb.getRecord()){
            filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Release.Name',
                value: cb.getRecord().get('Name')
            });
        }
        var filterObj = {};
        filterObj[this.portfolioItemTypes[1].toLowerCase()] = filters;
        return filterObj;
    },
    _launchChooser: function(){
        var release = this.down('#cb-release').getRecord() || null;

        Ext.create('Rally.ui.dialog.ArtifactChooserDialog', {
            artifactTypes: this.portfolioItemTypes[1],
            autoShow: true,
            release: release,
            portfolioItemTypes: this.portfolioItemTypes,
            height: 500,
            title: 'Choose PortfolioItem',
            multiple: true,
            listeners: {
                artifactchosen: function(dialog, selectedRecords){
                    this.selectedPortfolioItem = selectedRecords;
                    this._runReport();
                },
                scope: this
            }
        });
    },
    _runReport: function(){
        var rootItem = this.selectedPortfolioItem;
        this.logger.log('_runReport', rootItem);

        //determine if this is the detailed or summary view

        //load child artifacts
        var filters = [];
        Ext.each(rootItem, function(i){
            filters.push({
                property: 'ObjectID',
                value: i.get('ObjectID')
            });
        });
        filters = Rally.data.wsapi.Filter.or(filters);

        var childFilterHash = this._getChildFilter(this.down('#cb-release'));

        var columnModels = [this.portfolioItemTypes[1],this.portfolioItemTypes[0],'HierarchicalRequirement','Task'];
        var context = this.getContext();

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.portfolioItemTypes[1],this.portfolioItemTypes[0]],
            autoLoad: true,
            enableHierarchy: true,
            parentTypes: [this.portfolioItemTypes[1],this.portfolioItemTypes[0]],
            childFilters: childFilterHash,
            filters: filters
        }).then({
            scope: this,
            success: function(store) {
                if (this.down('#gb-report')){
                    this.down('#gb-report').destroy();
                }
                var gridboard = this.down('#display_box').add({
                        xtype: 'rallygridboard',
                        itemId: 'gb-report',
                        context: this.getContext(),
                        modelNames: [this.portfolioItemTypes[1],this.portfolioItemTypes[0]],
                        toggleState: 'grid',
                        plugins: [
                            {
                                ptype: 'rallygridboardfieldpicker',
                                headerPosition: 'left',
                                modelNames: columnModels,
                                stateful: true,
                                stateId: context.getScopedStateId('columns-example')
                            },
                            {
                                ptype: 'rallygridboardactionsmenu',
                                menuItems: [
                                    {
                                        text: 'Export Summary...',
                                        handler: function() {
                                            var filename = 'summary.html';
                                            Rally.technicalservices.Export.exportSummary(filename,
                                                this.down('rallygridboard').getGridOrBoard());
                                        },
                                        scope: this
                                    },
                                    {
                                        text: 'Export Details...',
                                        handler: function() {
                                            var filename = 'detail.html';
                                            Rally.technicalservices.Export.exportDetail(filename,
                                                this.down('rallygridboard').getGridOrBoard());
                                        },
                                        scope: this
                                    }
                                ],
                                buttonConfig: {
                                    iconCls: 'icon-export'
                                }
                            }


                        ],
                        cardBoardConfig: {
                            attribute: 'ScheduleState'
                        },
                        gridConfig: {
                            store: store,
                            columnCfgs: this._getColumnCfgs(),
                            collapsed: false,
                            listeners: {
                                scope: this,
                                load: function(ts,node){
                                    node.expand(true);
                                }
                            }
                        },
                        height: this.getHeight()
                    });

            }
         });

    },
    _expandNodes: function(gridboard){
        gridboard.on('load',function(gb){gb.getGridOrBoard().expandAll();},this, {single: true});
    },
    _getColumnCfgs: function(){
        return ['Name'];
    },
    _getReleaseFilters: function(){
        var release_name = this.down('#cb-release').getRecord().get('Name');

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Release',
            filters: [{
                property: 'Name',
                value: release_name
            }],
            fetch: ['_ref'],
            autoLoad: true,
            listeners: {
                scope: this,
                load: this._onReleasesLoaded
            }
        });
    },
    _onReleasesLoaded: function(store, records, success){
        if (success){
            var treeFilters = _.map(records, function(r){
                return {property: 'Release', value: r.get('_ref')};
            });
            treeFilters = Rally.data.wsapi.Filter.or(treeFilters);
            this._displayGrid(treeFilters);
        } else {
            Rally.ui.notify.Notifier.showError({message: "Unable to load releases"});
        }
    },
    _displayGrid: function(treeFilters){
        var models = ['PortfolioItem/Initiative'];
        var filterModels = ['PortfolioItem/Initiative','PortfolioItem/Feature'];
        var context = this.getContext();

        if (this.down('rallygridboard')){
            this.down('rallygridboard').remove();
        }

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: models,
            enableHierarchy: true,
            parentTypes: models
        }).then({
            scope: this,
            success: function(store) {

                var grid = Ext.create('Ext.Container', {
                    items: [{
                        xtype: 'rallygridboard',
                        context: context,
                       // modelNames: models,
                        toggleState: 'grid',
                        plugins: [
                            {
                                ptype: 'rallygridboardfieldpicker',
                                headerPosition: 'left',
                                modelNames: models,
                                stateful: true,
                                stateId: context.getScopedStateId('columns-example')
                            },
                            {
                                ptype: 'rallygridboardactionsmenu',
                                menuItems: [
                                    {
                                        text: 'Export...',
                                        handler: function() {
                                            window.location = Rally.ui.grid.GridCsvExport.buildCsvExportUrl(
                                                this.down('rallygridboard').getGridOrBoard());
                                        },
                                        scope: this
                                    }
                                ],
                                buttonConfig: {
                                    iconCls: 'icon-export'
                                }
                            },
                            {
                                ptype: 'rallygridboardcustomfiltercontrol',
                                filterControlConfig: {
                                    modelNames: filterModels,
                                    stateful: true,
                                    stateId: context.getScopedStateId('custom-filter-example')
                                },
                                showOwnerFilter: false
                            }
                        ],
                        cardBoardConfig: {
                            attribute: 'ScheduleState'
                        },
                        gridConfig: {
                            store: store,
                            columnCfgs: [
                                'Name'
                            ]
                        },
                        height: this.getHeight()
                    }]
                });

                this.down('#display_box').add(grid);
            }
        });    }
});
