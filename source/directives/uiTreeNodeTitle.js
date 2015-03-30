(function () {
  'use strict';

  angular.module('ui.tree')
    .directive('uiTreeNodeTitle', ['treeConfig', '$window',
      function (treeConfig) {
        return {
          require: '^uiTreeNode',
          restrict: 'A',
          scope: true,
          controller: 'TreeNodeTitleController',
          link: function (scope, element, attrs, treeNodeCtrl) {
            var config = {};
            angular.extend(config, treeConfig);
            if (config.nodeTitleClass) {
              element.addClass(config.nodeTitleClass);
            }
            // connect with the tree node.
            if (scope != treeNodeCtrl.scope) {
              scope.$nodeScope = treeNodeCtrl.scope;
              treeNodeCtrl.scope.$nodeTitleScope = scope;
            }
          }
        };
      }
    ]);
})();