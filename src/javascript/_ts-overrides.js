Ext.override(Rally.data.wsapi.TreeStoreBuilder, {
        _setupTreeModel: function(models, config) {
            var modelsToLoad = [];
            var allTypes = _.pluck(models, 'typePath');

            //Only want specific parent types
            var parentTypes = config.parentTypes;  //_.filter(allTypes, config.mapper.isParentType, config.mapper);

            config.enableHierarchy = config.enableHierarchy && parentTypes.length > 0;

            if(config.enableHierarchy) {
                config.parentTypes = parentTypes;
                modelsToLoad = this._getChildModelsToLoad(config);
            } else {
                config.parentTypes = allTypes;
            }

            if (modelsToLoad.length > 0) {
                return this._loadChildModels(modelsToLoad, models, config);
            }

            return Deft.Promise.when(models);
        }
    });

Ext.override(Rally.data.wsapi.TreeStore, {
    _getChildNodeFilters: function(node) {
        var parentType = node.self.typePath,
            childTypes = this._getChildTypePaths([parentType]),
            parentFieldNames = this._getParentFieldNames(childTypes, parentType);

        if (parentFieldNames.length) {
            var filters =  Rally.data.wsapi.Filter.or(_.map(parentFieldNames, function(parentFieldName) {
                return {
                    property: parentFieldName,
                    operator: '=',
                    value: node.get('_ref')
                };
            }));
            if (this.childFilters && this.childFilters[parentType]){
                 return [filters.and(this.childFilters[parentType])];
            }
            return [filters];
        }
        return [];
    },
    filterChildren: function(childFilterObjects){
        //need to make sure that the fields are on the types
        this.childFilters = childFilterObjects;
        this.load();
    }
});

Ext.override(Rally.ui.grid.TreeView,{
    _expandHandler: function(node, children){
        if (this.getTreeStore().getRootNode() !== node && children.length === 0){
            this.refresh(); //treegrid freaks out when it tries to expand a node that has no children, so force a refresh
            if (!this.getTreeStore().hasErrors()){
                Rally.ui.notify.Notifier.showWarning({message:node.get('FormattedID') + ' may have children that do not meet the selected release criteria and are not included in this report.'});
            }
        }
    }
});

Ext.override(Rally.ui.grid.plugin.TreeGridChildPager, {
    _storeHasMoreChildPages: function(parentRecord) {
        var loadedCount = this._getLoadedCount(parentRecord);
        var childPageSize = this.cmp.getStore().getChildPageSize(parentRecord);
        return parentRecord.get('leafCount') > loadedCount && loadedCount >= childPageSize;
    }
});

Ext.override(Rally.ui.gridboard.plugin.GridBoardFieldPicker, {
    gridFieldBlackList: [
        'Actuals',
        'Changesets',
        'Children',
        //   'Description',
        //   'Notes',
        'ObjectID',
        'Predecessors',
        'RevisionHistory',
        'Subscription',
        'Successors',
        'TaskIndex',
        'Workspace',
        'VersionId'
    ]
});

Ext.override(Rally.ui.dialog.ArtifactChooserDialog, {
    beforeRender: function() {
        this.callParent(arguments);

        if (this.introText) {
            this.addDocked({
                xtype: 'component',
                componentCls: 'intro-panel',
                html: this.introText
            });
        }
        this.addDocked({
            xtype: 'radiogroup',
            fieldLabel: 'Select Type',
            // Arrange radio buttons into two columns, distributed vertically
            columns: 2,
            vertical: true,
            items: [
                { boxLabel: 'Features', name: 'roottype', inputValue: 0 },
                { boxLabel: 'Initiatives', name: 'roottype', inputValue: 1, checked: true}
            ],
            listeners: {
                scope: this,
                change: function(rg){
                    var type_index = rg.getValue().roottype;
                    this.setArtifactTypes([this.portfolioItemTypes[type_index]]);

                    if (type_index > 0){
                        this.storeFilters = [];
                    } else {
                        if (this.release){
                            this.storeFilters = [{
                                property: 'Release.Name',
                                value: this.release.get('Name')
                            }];
                        } else {
                            this.storeFilters = [{
                                property: 'Release',
                                value: ""
                            }];
                        }
                    }
                    this.buildGrid();
                }
            }
        });

        this.addDocked({
            xtype: 'toolbar',
            itemId: 'searchBar',
            dock: 'top',
            border: false,
            padding: '0 0 10px 0',
            items: this.getSearchBarItems()
        });

        this.buildGrid();

        this.selectionCache = this.getInitialSelectedRecords() || [];
    },
    getStoreFilters: function() {
        return this.storeFilters || [];
    }
});