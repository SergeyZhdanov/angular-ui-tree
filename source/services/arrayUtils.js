(function () {
  "use strict";

  var arrayUtils = {};

  arrayUtils.sortBy = function (array, sortByFunc) {

    var copy = array.map(function (element) {
      return {
        element: element,
        sortingValues: [sortByFunc(element)]
      };
    });

    copy.sort(function (a, b) {
      for (var i = 0; i < a.sortingValues.length; i++) {
        var aVal = a.sortingValues[i];
        var bVal = b.sortingValues[i];

        if (aVal < bVal) {
          return -1;
        }

        if (aVal > bVal) {
          return 1;
        }
      }

      return 0;
    });

    return copy.map(function (a) {
      return a.element;
    });
  };

  arrayUtils.asArray = function (arrLikeObj) {
    return Array.prototype.slice.call(arrLikeObj);
  };

  angular.module("ui.tree")
    .factory("uiTreeArrayUtils", function () {
      return arrayUtils;
    });
})();