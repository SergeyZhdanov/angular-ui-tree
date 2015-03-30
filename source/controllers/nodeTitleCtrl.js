(function () {
  'use strict';

  angular.module('ui.tree')

    .controller('TreeNodeTitleController', ['$scope', '$element', '$attrs', 'treeConfig',
      function ($scope, $element, $attrs, treeConfig) {
        this.scope = $scope;

        $scope.$element = $element;
        $scope.$nodeScope = null;
        $scope.$type = 'uiTreeNodeTitle';

      }
    ]);
})();