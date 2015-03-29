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
        console.log('_getChildNodeFilters',node, parentType, childTypes,parentFieldNames, this.childFilters);

        if (parentFieldNames.length) {
            var filters =  Rally.data.wsapi.Filter.or(_.map(parentFieldNames, function(parentFieldName) {
                return {
                    property: parentFieldName,
                    operator: '=',
                    value: node.get('_ref')
                };
            }));
            if (this.childFilters && this.childFilters[parentType]){
                console.log(filters.and(this.childFilters[parentType]).toString());
                return [filters.and(this.childFilters[parentType])];
            }
            return [filters];
        }
        return [];
    },
    filterChildren: function(childFilterObjects){
        //need to make sure that the fields are on the types
        this.childFilters = childFilterObjects;
        console.log(this.childFilters);
        this.load();
    }
});


Ext.override(Rally.ui.grid.plugin.TreeGridChildPager, {
    _storeHasMoreChildPages: function(parentRecord) {
        var loadedCount = this._getLoadedCount(parentRecord);
        var childPageSize = this.cmp.getStore().getChildPageSize(parentRecord);
        console.log('_storeHasMoreChildPages', loadedCount, parentRecord.get('leafCount'));
        return parentRecord.get('leafCount') > loadedCount && loadedCount >= childPageSize;
    }
});