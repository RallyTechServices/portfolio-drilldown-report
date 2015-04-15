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
