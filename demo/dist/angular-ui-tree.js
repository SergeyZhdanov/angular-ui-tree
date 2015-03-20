/**
 * @license Angular UI Tree v2.1.5
 * (c) 2010-2014. https://github.com/JimLiu/angular-ui-tree
 * License: MIT
 */
(function () {
  'use strict';

  angular.module('ui.tree', [])
    .constant('treeConfig', {
      treeClass: 'angular-ui-tree',
      emptyTreeClass: 'angular-ui-tree-empty',
      hiddenClass: 'angular-ui-tree-hidden',
      nodesClass: 'angular-ui-tree-nodes',
      nodeClass: 'angular-ui-tree-node',
      handleClass: 'angular-ui-tree-handle',
      placeHolderClass: 'angular-ui-tree-placeholder',
      dragClass: 'angular-ui-tree-drag',
      dragThreshold: 3,
      levelThreshold: 30
    });

})();

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
(function () {
  "use strict";

  var sqr = function (x) {
    return x * x;
  };

  var geometry = {};

  geometry.distanceToPoint = function (x, y, pointX, pointY) {
    return Math.sqrt(sqr(x - pointX) + sqr(y - pointY));
  };

  geometry.isPointInSection = function (x, start, end) {
    return start <= x && x <= end;
  };

  geometry.overlapSection = function (start1, end1, start2, end2) {

    if (geometry.isPointInSection(start1, start2, end2) ||
        geometry.isPointInSection(end1, start2, end2) ||
        geometry.isPointInSection(start2, start1, end1) ||
        geometry.isPointInSection(end2, start1, end1)) {
      return {
        start: Math.max(start1, start2),
        end: Math.min(end1, end2)
      };
    }

    return null;
  };

  geometry.pointsDistance = function (point1, point2) {
    return geometry.distanceToPoint(point1.x, point1.y, point2.x, point2.y);
  };

  geometry.rect = function (element) {
    var rects = element.getClientRects();
    if (rects.length) {
      return rects[0];
    }

    return null;
  };

  geometry.translateRect = function (rect, offset) {
    return {
      left: rect.left + offset.x,
      right: rect.right + offset.x,
      top: rect.top + offset.y,
      bottom: rect.bottom + offset.y,
      width: rect.width,
      height: rect.height
    };
  };

  geometry.offset = function (fromPoint, toPoint) {
    return {
      x: toPoint.x - fromPoint.x,
      y: toPoint.y - fromPoint.y
    };
  };

  geometry.overlapRec = function (r1, r2) {
    var horizOverlap = geometry.overlapSection(r1.left, r1.right, r2.left, r2.right);
    var vertOverlap = geometry.overlapSection(r1.top, r1.bottom, r2.top, r2.bottom);

    if (horizOverlap != null && vertOverlap != null) {
      var overlapRect = {
        left: horizOverlap.start,
        right: horizOverlap.end,
        top: vertOverlap.start,
        bottom: vertOverlap.end
      };

      return overlapRect;
    }
    else {
      return null;
    }
  };

  geometry.overlapArea = function (rec1, rec2) {
    var overlapRec = geometry.overlapRec(rec1, rec2);
    if (overlapRec) {
      return geometry.rectArea(overlapRec);
    }
    return 0;
  };

  geometry.rectCenter = function (rec) {
    return {
      x: rec.left + (rec.right - rec.left) / 2,
      y: rec.top + (rec.bottom - rec.top) / 2
    };
  };

  geometry.rectArea = function (rect) {
    return Math.sqrt(sqr(rect.left - rect.right)) * Math.sqrt(sqr(rect.top - rect.bottom));
  };

  geometry.isPointInRect = function (rect, point) {
    return rect.left <= point.x && rect.right >= point.x &&
           rect.top <= point.y && rect.bottom >= point.y;
  };

  angular.module("ui.tree")
         .factory("uiTreeGeometry", function () {
            return geometry;
          });
})();
(function () {
  'use strict';

  angular.module('ui.tree')

   /**
    * @ngdoc service
    * @name ui.tree.service:$helper
    * @requires ng.$document
    * @requires ng.$window
    *
    * @description
    * angular-ui-tree.
    */
    .factory('$uiTreeHelper', ['$document', '$window',
      function ($document, $window) {
        return {

          /**
           * A hashtable used to storage data of nodes
           * @type {Object}
           */
          nodesData: {
          },

          setNodeAttribute: function(scope, attrName, val) {
            if (!scope.$modelValue) {
              return null;
            }
            var data = this.nodesData[scope.$modelValue.$$hashKey];
            if (!data) {
              data = {};
              this.nodesData[scope.$modelValue.$$hashKey] = data;
            }
            data[attrName] = val;
          },

          getNodeAttribute: function(scope, attrName) {
            if (!scope.$modelValue) {
              return null;
            }
            var data = this.nodesData[scope.$modelValue.$$hashKey];
            if (data) {
              return data[attrName];
            }
            return null;
          },

          /**
           * @ngdoc method
           * @methodOf ui.tree.service:$nodrag
           * @param  {Object} targetElm angular element
           * @return {Bool} check if the node can be dragged.
           */
          nodrag: function (targetElm) {
            return (typeof targetElm.attr('data-nodrag')) != "undefined";
          },

          /**
           * get the event object for touchs
           * @param  {[type]} e [description]
           * @return {[type]}   [description]
           */
          eventObj: function(e) {
            var obj = e;
            if (e.targetTouches !== undefined) {
              obj = e.targetTouches.item(0);
            } else if (e.originalEvent !== undefined && e.originalEvent.targetTouches !== undefined) {
              obj = e.originalEvent.targetTouches.item(0);
            }
            return obj;
          },

          dragInfo: function(node, e) {
            return {
              originalRect: node.$element[0].getClientRects()[0],
              originalPoint: { x: e.pageX, y: e.pageY },
              source: node,
              sourceInfo: {
                nodeScope: node,
                index: node.index(),
                nodesScope: node.$parentNodesScope,
                treeId: node.$treeId
              },
              index: node.index(),
              siblings: node.siblings().slice(0),
              parent: node.$parentNodesScope,

              moveTo: function(parent, siblings, index) { // Move the node to a new position
                this.parent = parent;
                this.siblings = siblings.slice(0);
                var i = this.siblings.indexOf(this.source); // If source node is in the target nodes
                if (i > -1) {
                  this.siblings.splice(i, 1);
                  if (this.source.index() < index) {
                    index--;
                  }
                }
                this.siblings.splice(index, 0, this.source);
                this.index = index;
              },

              parentNode: function() {
                return this.parent.$nodeScope;
              },

              prev: function() {
                if (this.index > 0) {
                  return this.siblings[this.index - 1];
                }
                return null;
              },

              next: function() {
                if (this.index < this.siblings.length - 1) {
                  return this.siblings[this.index + 1];
                }
                return null;
              },

              isDirty: function() {
                return this.source.$parentNodesScope != this.parent ||
                        this.source.index() != this.index;
              },

              eventArgs: function(elements, pos) {
                return {
                  source: this.sourceInfo,
                  dest: {
                    index: this.index,
                    nodesScope: this.parent,
                    treeId: this.parent.$treeId
                  },
                  elements: elements,
                  pos: pos
                };
              },

              apply: function() {
                var nodeData = this.source.$modelValue;
                this.source.remove();
                this.parent.insertNode(this.index, nodeData);
              }
            };
          },

          /**
          * @ngdoc method
          * @name hippo.theme#height
          * @methodOf ui.tree.service:$helper
          *
          * @description
          * Get the height of an element.
          *
          * @param {Object} element Angular element.
          * @returns {String} Height
          */
          height: function (element) {
            return element.prop('scrollHeight');
          },

          /**
          * @ngdoc method
          * @name hippo.theme#width
          * @methodOf ui.tree.service:$helper
          *
          * @description
          * Get the width of an element.
          *
          * @param {Object} element Angular element.
          * @returns {String} Width
          */
          width: function (element) {
            return element.prop('scrollWidth');
          },

          /**
          * @ngdoc method
          * @name hippo.theme#offset
          * @methodOf ui.nestedSortable.service:$helper
          *
          * @description
          * Get the offset values of an element.
          *
          * @param {Object} element Angular element.
          * @returns {Object} Object with properties width, height, top and left
          */
          offset: function (element) {
            var boundingClientRect = element[0].getBoundingClientRect();

            return {
                width: element.prop('offsetWidth'),
                height: element.prop('offsetHeight'),
                top: boundingClientRect.top + ($window.pageYOffset || $document[0].body.scrollTop || $document[0].documentElement.scrollTop),
                left: boundingClientRect.left + ($window.pageXOffset || $document[0].body.scrollLeft  || $document[0].documentElement.scrollLeft)
              };
          },

          /**
          * @ngdoc method
          * @name hippo.theme#positionStarted
          * @methodOf ui.tree.service:$helper
          *
          * @description
          * Get the start position of the target element according to the provided event properties.
          *
          * @param {Object} e Event
          * @param {Object} target Target element
          * @returns {Object} Object with properties offsetX, offsetY, startX, startY, nowX and dirX.
          */
          positionStarted: function (e, target) {
            var pos = {};
            pos.offsetX = e.pageX - this.offset(target).left;
            pos.offsetY = e.pageY - this.offset(target).top;
            pos.startX = pos.lastX = e.pageX;
            pos.startY = pos.lastY = e.pageY;
            pos.nowX = pos.nowY = pos.distX = pos.distY = pos.dirAx = 0;
            pos.dirX = pos.dirY = pos.lastDirX = pos.lastDirY = pos.distAxX = pos.distAxY = 0;
            return pos;
          },

          positionMoved: function (e, pos, firstMoving) {
            // mouse position last events
            pos.lastX = pos.nowX;
            pos.lastY = pos.nowY;

            // mouse position this events
            pos.nowX  = e.pageX;
            pos.nowY  = e.pageY;

            // distance mouse moved between events
            pos.distX = pos.nowX - pos.lastX;
            pos.distY = pos.nowY - pos.lastY;

            // direction mouse was moving
            pos.lastDirX = pos.dirX;
            pos.lastDirY = pos.dirY;

            // direction mouse is now moving (on both axis)
            pos.dirX = pos.distX === 0 ? 0 : pos.distX > 0 ? 1 : -1;
            pos.dirY = pos.distY === 0 ? 0 : pos.distY > 0 ? 1 : -1;

            // axis mouse is now moving on
            var newAx   = Math.abs(pos.distX) > Math.abs(pos.distY) ? 1 : 0;

            // do nothing on first move
            if (firstMoving) {
              pos.dirAx  = newAx;
              pos.moving = true;
              return;
            }

            // calc distance moved on this axis (and direction)
            if (pos.dirAx !== newAx) {
              pos.distAxX = 0;
              pos.distAxY = 0;
            } else {
              pos.distAxX += Math.abs(pos.distX);
              if (pos.dirX !== 0 && pos.dirX !== pos.lastDirX) {
                pos.distAxX = 0;
              }

              pos.distAxY += Math.abs(pos.distY);
              if (pos.dirY !== 0 && pos.dirY !== pos.lastDirY) {
                pos.distAxY = 0;
              }
            }

            pos.dirAx = newAx;
          }
        };
      }
    ]);

})();
(function () {
  'use strict';

  angular.module('ui.tree')

    .controller('TreeController', ['$scope', '$element', '$attrs', 'treeConfig',
      function ($scope, $element, $attrs, treeConfig) {
        this.scope = $scope;

        $scope.$element = $element;
        $scope.$nodesScope = null; // root nodes
        $scope.$type = 'uiTree';
        $scope.$emptyElm = null;
        $scope.$callbacks = null;

        $scope.dragEnabled = true;
        $scope.emptyPlaceHolderEnabled = true;
        $scope.maxDepth = 0;
        $scope.dragDelay = 0;

        // Check if it's a empty tree
        $scope.isEmpty = function() {
          return ($scope.$nodesScope && $scope.$nodesScope.$modelValue
            && $scope.$nodesScope.$modelValue.length === 0);
        };

        // add placeholder to empty tree
        $scope.place = function(placeElm) {
          $scope.$nodesScope.$element.append(placeElm);
          $scope.$emptyElm.remove();
        };

        $scope.resetEmptyElement = function() {
          if ($scope.$nodesScope.$modelValue.length === 0 &&
            $scope.emptyPlaceHolderEnabled) {
            $element.append($scope.$emptyElm);
          } else {
            $scope.$emptyElm.remove();
          }
        };

        var collapseOrExpand = function(scope, collapsed) {
          var nodes = scope.childNodes();
          for (var i = 0; i < nodes.length; i++) {
            collapsed ? nodes[i].collapse() : nodes[i].expand();
            var subScope = nodes[i].$childNodesScope;
            if (subScope) {
              collapseOrExpand(subScope, collapsed);
            }
          }
        };

        $scope.collapseAll = function() {
          collapseOrExpand($scope.$nodesScope, true);
        };

        $scope.expandAll = function() {
          collapseOrExpand($scope.$nodesScope, false);
        };

      }
    ]);
})();

(function () {
  'use strict';

  angular.module('ui.tree')

    .controller('TreeNodesController', ['$scope', '$element', 'treeConfig',
      function ($scope, $element, treeConfig) {
        this.scope = $scope;

        $scope.$element = $element;
        $scope.$modelValue = null;
        $scope.$nodeScope = null; // the scope of node which the nodes belongs to
        $scope.$treeScope = null;
        $scope.$type = 'uiTreeNodes';
        $scope.$nodesMap = {};

        $scope.nodrop = false;
        $scope.maxDepth = 0;

        $scope.initSubNode = function(subNode) {
          if(!subNode.$modelValue) {
            return null;
          }
          $scope.$nodesMap[subNode.$modelValue.$$hashKey] = subNode;
        };

        $scope.destroySubNode = function(subNode) {
          if(!subNode.$modelValue) {
            return null;
          }
          $scope.$nodesMap[subNode.$modelValue.$$hashKey] = null;
        };

        $scope.accept = function(sourceNode, destIndex) {
          return $scope.$treeScope.$callbacks.accept(sourceNode, $scope, destIndex);
        };

        $scope.beforeDrag = function(sourceNode) {
          return $scope.$treeScope.$callbacks.beforeDrag(sourceNode);
        };

        $scope.isParent = function(node) {
          return node.$parentNodesScope == $scope;
        };

        $scope.hasChild = function() {
          return $scope.$modelValue.length > 0;
        };

        $scope.safeApply = function(fn) {
          var phase = this.$root.$$phase;
          if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
              fn();
            }
          } else {
            this.$apply(fn);
          }
        };

        $scope.removeNode = function(node) {
          var index = $scope.$modelValue.indexOf(node.$modelValue);
          if (index > -1) {
            $scope.safeApply(function() {
              $scope.$modelValue.splice(index, 1)[0];
            });
            return node;
          }
          return null;
        };

        $scope.insertNode = function(index, nodeData) {
          $scope.safeApply(function() {
            $scope.$modelValue.splice(index, 0, nodeData);
          });
        };

        $scope.childNodes = function() {
          var nodes = [];
          if ($scope.$modelValue) {
            for (var i = 0; i < $scope.$modelValue.length; i++) {
              nodes.push($scope.$nodesMap[$scope.$modelValue[i].$$hashKey]);
            }
          }
          return nodes;
        };

        $scope.depth = function() {
          if ($scope.$nodeScope) {
            return $scope.$nodeScope.depth();
          }
          return 0; // if it has no $nodeScope, it's root
        };

        // check if depth limit has reached
        $scope.outOfDepth = function(sourceNode) {
          var maxDepth = $scope.maxDepth || $scope.$treeScope.maxDepth;
          if (maxDepth > 0) {
            return $scope.depth() + sourceNode.maxSubDepth() + 1 > maxDepth;
          }
          return false;
        };

      }
    ]);
})();
(function () {
  'use strict';

  angular.module('ui.tree')

    .controller('TreeNodeController', ['$scope', '$element', '$attrs', 'treeConfig',
      function ($scope, $element, $attrs, treeConfig) {
        this.scope = $scope;

        $scope.$element = $element;
        $scope.$modelValue = null; // Model value for node;
        $scope.$parentNodeScope = null; // uiTreeNode Scope of parent node;
        $scope.$childNodesScope = null; // uiTreeNodes Scope of child nodes.
        $scope.$parentNodesScope = null; // uiTreeNodes Scope of parent nodes.
        $scope.$treeScope = null; // uiTree scope
        $scope.$handleScope = null; // it's handle scope
        $scope.$type = 'uiTreeNode';
        $scope.$$apply = false; //

        $scope.collapsed = false;

        $scope.init = function(controllersArr) {
          var treeNodesCtrl = controllersArr[0];
          $scope.$treeScope = controllersArr[1] ? controllersArr[1].scope : null;

          // find the scope of it's parent node
          $scope.$parentNodeScope = treeNodesCtrl.scope.$nodeScope;
          // modelValue for current node
          $scope.$modelValue = treeNodesCtrl.scope.$modelValue[$scope.$index];
          $scope.$parentNodesScope = treeNodesCtrl.scope;
          treeNodesCtrl.scope.initSubNode($scope); // init sub nodes

          $element.on('$destroy', function() {
            treeNodesCtrl.scope.destroySubNode($scope); // destroy sub nodes
          });
        };

        $scope.index = function() {
          return $scope.$parentNodesScope.$modelValue.indexOf($scope.$modelValue);
        };

        $scope.dragEnabled = function() {
          return !($scope.$treeScope && !$scope.$treeScope.dragEnabled);
        };

        $scope.isSibling = function(targetNode) {
          return $scope.$parentNodesScope == targetNode.$parentNodesScope;
        };

        $scope.isChild = function(targetNode) {
          var nodes = $scope.childNodes();
          return nodes && nodes.indexOf(targetNode) > -1;
        };

        $scope.prev = function() {
          var index = $scope.index();
          if (index > 0) {
            return $scope.siblings()[index - 1];
          }
          return null;
        };

        $scope.siblings = function() {
          return $scope.$parentNodesScope.childNodes();
        };

        $scope.childNodesCount = function() {
          return $scope.childNodes() ? $scope.childNodes().length : 0;
        };

        $scope.hasChild = function() {
          return $scope.childNodesCount() > 0;
        };

        $scope.childNodes = function() {
          return $scope.$childNodesScope && $scope.$childNodesScope.$modelValue ?
              $scope.$childNodesScope.childNodes() :
              null;
        };

        $scope.accept = function(sourceNode, destIndex) {
          return $scope.$childNodesScope &&
                  $scope.$childNodesScope.$modelValue &&
                  $scope.$childNodesScope.accept(sourceNode, destIndex);
        };

        $scope.removeNode = function(){
          var node = $scope.remove();
          $scope.$callbacks.removed(node);
          return node;
        };

        $scope.remove = function() {
          return $scope.$parentNodesScope.removeNode($scope);
        };

        $scope.toggle = function() {
          $scope.collapsed = !$scope.collapsed;
        };

        $scope.collapse = function() {
          $scope.collapsed = true;
        };

        $scope.expand = function() {
          $scope.collapsed = false;
        };

        $scope.depth = function() {
          var parentNode = $scope.$parentNodeScope;
          if (parentNode) {
            return parentNode.depth() + 1;
          }
          return 1;
        };

        var subDepth = 0;
        var countSubDepth = function(scope) {
          var count = 0;
          var nodes = scope.childNodes();
          for (var i = 0; i < nodes.length; i++) {
            var childNodes = nodes[i].$childNodesScope;
            if (childNodes) {
              count = 1;
              countSubDepth(childNodes);
            }
          }
          subDepth += count;
        };

        $scope.maxSubDepth = function() {
          subDepth = 0;
          if ($scope.$childNodesScope) {
            countSubDepth($scope.$childNodesScope);
          }
          return subDepth;
        };

      }
    ]);
})();

(function () {
  'use strict';

  angular.module('ui.tree')

    .controller('TreeHandleController', ['$scope', '$element', '$attrs', 'treeConfig',
      function ($scope, $element, $attrs, treeConfig) {
        this.scope = $scope;

        $scope.$element = $element;
        $scope.$nodeScope = null;
        $scope.$type = 'uiTreeHandle';

      }
    ]);
})();

(function () {
  'use strict';

  angular.module('ui.tree')
  .directive('uiTree', [ 'treeConfig', '$window',
    function(treeConfig, $window) {
      return {
        restrict: 'A',
        scope: true,
        controller: 'TreeController',
        link: function(scope, element, attrs) {
          var callbacks = {
            accept: null,
            beforeDrag: null
          };

          var config = {};
          angular.extend(config, treeConfig);
          if (config.treeClass) {
            element.addClass(config.treeClass);
          }

          scope.$emptyElm = angular.element($window.document.createElement('div'));
          if (config.emptyTreeClass) {
            scope.$emptyElm.addClass(config.emptyTreeClass);
          }

          scope.$treeId = attrs.id;

          scope.$watch('$nodesScope.$modelValue.length', function() {
            if (scope.$nodesScope.$modelValue) {
              scope.resetEmptyElement();
            }
          }, true);

          scope.$watch(attrs.dragEnabled, function(val) {
            if((typeof val) == "boolean") {
              scope.dragEnabled = val;
            }
          });

          scope.$watch(attrs.emptyPlaceHolderEnabled, function(val) {
            if((typeof val) == "boolean") {
              scope.emptyPlaceHolderEnabled = val;
            }
          });

          scope.$watch(attrs.maxDepth, function(val) {
            if((typeof val) == "number") {
              scope.maxDepth = val;
            }
          });

          scope.$watch(attrs.dragDelay, function(val) {
            if((typeof val) == "number") {
              scope.dragDelay = val;
            }
          });

          scope.$watch(attrs.lockX, function(val) {
            if ((typeof val) == "boolean") {
              scope.lockX = val;
            }
          });

          scope.$watch(attrs.lockY, function(val) {
            if ((typeof val) == "boolean") {
              scope.lockY = val;
            }
          });

          scope.$watch(attrs.boundTo, function(val) {
            if ((typeof val) == "string" && val.length > 0) {
              scope.boundTo = angular.element(val);
            }
          });

          // check if the dest node can accept the dragging node
          // by default, we check the 'data-nodrop' attribute in `ui-tree-nodes`
          // and the 'max-depth' attribute in `ui-tree` or `ui-tree-nodes`.
          // the method can be overrided
          callbacks.accept = function(sourceNodeScope, destNodesScope, destIndex) {
            if (destNodesScope.nodrop || destNodesScope.outOfDepth(sourceNodeScope)) {
              return false;
            }
            return true;
          };

          callbacks.beforeDrag = function(sourceNodeScope) {
            return true;
          };

          callbacks.removed = function(node){
          
          };

          callbacks.dropped = function(event) {

          };

          //
          callbacks.dragStart = function(event) {

          };

          callbacks.dragMove = function(event) {

          };

          callbacks.dragStop = function(event) {

          };

          callbacks.beforeDrop = function(event) {

          };

          scope.$watch(attrs.uiTree, function(newVal, oldVal){
            angular.forEach(newVal, function(value, key){
              if (callbacks[key]) {
                if (typeof value === "function") {
                  callbacks[key] = value;
                }
              }
            });

            scope.$callbacks = callbacks;
          }, true);


        }
      };
    }
  ]);
})();

(function () {
  'use strict';

  angular.module('ui.tree')
  .directive('uiTreeNodes', [ 'treeConfig', '$window',
    function(treeConfig) {
      return {
        require: ['ngModel', '?^uiTreeNode', '^uiTree'],
        restrict: 'A',
        scope: true,
        controller: 'TreeNodesController',
        link: function(scope, element, attrs, controllersArr) {

          var config = {};
          angular.extend(config, treeConfig);
          if (config.nodesClass) {
            element.addClass(config.nodesClass);
          }

          var ngModel = controllersArr[0];
          var treeNodeCtrl = controllersArr[1];
          var treeCtrl = controllersArr[2];
          if (treeNodeCtrl) {
            treeNodeCtrl.scope.$childNodesScope = scope;
            scope.$nodeScope = treeNodeCtrl.scope;
          }
          else { // find the root nodes if there is no parent node and have a parent ui-tree
            treeCtrl.scope.$nodesScope = scope;
          }
          scope.$treeScope = treeCtrl.scope;

          if (ngModel) {
            ngModel.$render = function() {
              if (!ngModel.$modelValue || !angular.isArray(ngModel.$modelValue)) {
                scope.$modelValue = [];
              }
              scope.$modelValue = ngModel.$modelValue;
            };
          }

          scope.$watch(attrs.maxDepth, function(val) {
            if((typeof val) == "number") {
              scope.maxDepth = val;
            }
          });

          scope.$watch(function () {
            return attrs.nodrop;
          }, function (newVal) {
            if((typeof newVal) != "undefined") {
              scope.nodrop = true;
            }
          }, true);

          attrs.$observe('horizontal', function(val) {
            scope.horizontal = ((typeof val) != "undefined");
          });

        }
      };
    }
  ]);
})();

(function () {
  'use strict';

  angular.module('ui.tree')

    .directive('uiTreeNode', ['treeConfig', '$uiTreeHelper', '$window', '$document', '$timeout', 'uiTreeGeometry', 'uiTreeArrayUtils',
      function (treeConfig, $uiTreeHelper, $window, $document, $timeout, geometry, arrayUtils) {
        return {
          require: ['^uiTreeNodes', '^uiTree'],
          restrict: 'A',
          controller: 'TreeNodeController',
          link: function (scope, element, attrs, controllersArr) {
            var config = {};
            angular.extend(config, treeConfig);
            if (config.nodeClass) {
              element.addClass(config.nodeClass);
            }
            scope.init(controllersArr);

            scope.collapsed = !!$uiTreeHelper.getNodeAttribute(scope, 'collapsed');

            scope.$watch(attrs.collapsed, function (val) {
              if ((typeof val) == "boolean") {
                scope.collapsed = val;
              }
            });

            scope.$watch('collapsed', function (val) {
              $uiTreeHelper.setNodeAttribute(scope, 'collapsed', val);
              attrs.$set('collapsed', val);
            });

            var hasTouch = 'ontouchstart' in window;
            // todo startPos is unused
            var startPos, firstMoving, dragInfo, pos;
            var placeElm, hiddenPlaceElm, dragElm;
            var treeScope = null;
            var elements; // As a parameter for callbacks
            var dragDelaying = true;
            var dragStarted = false;
            var dragTimer = null;
            var body = document.body,
                html = document.documentElement,
                document_height,
                document_width;

            var dragStart = function (e) {
              if (!hasTouch && (e.button == 2 || e.which == 3)) {
                // disable right click
                return;
              }
              if (e.uiTreeDragging || (e.originalEvent && e.originalEvent.uiTreeDragging)) { // event has already fired in other scope.
                return;
              }

              // the element which is clicked.
              var eventElm = angular.element(e.target);
              var eventScope = eventElm.scope();
              if (!eventScope || !eventScope.$type) {
                return;
              }
              if (eventScope.$type != 'uiTreeNode'
                && eventScope.$type != 'uiTreeHandle') { // Check if it is a node or a handle
                return;
              }
              if (eventScope.$type == 'uiTreeNode'
                && eventScope.$handleScope) { // If the node has a handle, then it should be clicked by the handle
                return;
              }

              var eventElmTagName = eventElm.prop('tagName').toLowerCase();
              if (eventElmTagName == 'input' ||
                eventElmTagName == 'textarea' ||
                eventElmTagName == 'button' ||
                eventElmTagName == 'select') { // if it's a input or button, ignore it
                return;
              }

              // check if it or it's parents has a 'data-nodrag' attribute
              while (eventElm && eventElm[0] && eventElm[0] != element) {
                if ($uiTreeHelper.nodrag(eventElm)) { // if the node mark as `nodrag`, DONOT drag it.
                  return;
                }
                eventElm = eventElm.parent();
              }

              if (!scope.beforeDrag(scope)) {
                return;
              }

              e.uiTreeDragging = true; // stop event bubbling
              if (e.originalEvent) {
                e.originalEvent.uiTreeDragging = true;
              }
              e.preventDefault();
              var eventObj = $uiTreeHelper.eventObj(e);

              firstMoving = true;
              dragInfo = $uiTreeHelper.dragInfo(scope, e);

              var tagName = scope.$element.prop('tagName');
              if (tagName.toLowerCase() === 'tr') {
                placeElm = angular.element($window.document.createElement(tagName));
                var tdElm = angular.element($window.document.createElement('td'))
                              .addClass(config.placeHolderClass);
                placeElm.append(tdElm);
              } else {
                placeElm = angular.element($window.document.createElement(tagName))
                              .addClass(config.placeHolderClass);
              }
              hiddenPlaceElm = angular.element($window.document.createElement(tagName));
              if (config.hiddenClass) {
                hiddenPlaceElm.addClass(config.hiddenClass);
              }
              pos = $uiTreeHelper.positionStarted(eventObj, scope.$element);
              placeElm.css('height', $uiTreeHelper.height(scope.$element) + 'px');
              placeElm.css('width', $uiTreeHelper.width(scope.$element) + 'px');
              dragElm = angular.element($window.document.createElement(scope.$parentNodesScope.$element.prop('tagName')))
                        .addClass(scope.$parentNodesScope.$element.attr('class')).addClass(config.dragClass);
              dragElm.css('width', $uiTreeHelper.width(scope.$element) + 'px');
              dragElm.css('z-index', 9999);

              // Prevents cursor to change rapidly in Opera 12.16 and IE when dragging an element
              var hStyle = (scope.$element[0].querySelector('.' + config.handleClass) || scope.$element[0]).currentStyle;
              if (hStyle) {
                document.body.setAttribute('ui-tree-cursor', $document.find('body').css('cursor') || '');
                $document.find('body').css({ 'cursor': hStyle.cursor + '!important' });
              }

              scope.$element.after(placeElm);
              scope.$element.after(hiddenPlaceElm);

              dragElm.append(scope.$element);
              $document.find('body').append(dragElm);
              dragElm.css({
                'left': eventObj.pageX - pos.offsetX + 'px',
                'top': eventObj.pageY - pos.offsetY + 'px'
              });
              elements = {
                placeholder: placeElm,
                dragging: dragElm
              };

              angular.element($document).bind('touchend', dragEndEvent);
              angular.element($document).bind('touchcancel', dragEndEvent);
              angular.element($document).bind('touchmove', dragMoveEvent);
              angular.element($document).bind('mouseup', dragEndEvent);
              angular.element($document).bind('mousemove', dragMoveEvent);
              angular.element($document).bind('mouseleave', dragCancelEvent);

              document_height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
              document_width = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
            };

            var dragMove = function (e) {
              if (!dragStarted) {
                if (!dragDelaying) {
                  dragStarted = true;
                  scope.$apply(function () {
                    scope.$callbacks.dragStart(dragInfo.eventArgs(elements, pos));
                  });
                }
                return;
              }

              var eventObj = $uiTreeHelper.eventObj(e);
              var prev, leftElmPos, topElmPos;

              if (dragElm) {
                e.preventDefault();

                if ($window.getSelection) {
                  $window.getSelection().removeAllRanges();
                } else if ($window.document.selection) {
                  $window.document.selection.empty();
                }

                leftElmPos = eventObj.pageX - pos.offsetX;
                topElmPos = eventObj.pageY - pos.offsetY;
                //dragElm can't leave the screen or the bounding parent on the left
                var isBoundTo = scope.boundTo && scope.boundTo.length > 0;
                if ((!isBoundTo && leftElmPos < 0) || (isBoundTo && leftElmPos < scope.boundTo.offset().left)) {
                  leftElmPos = !isBoundTo ? 0 : scope.boundTo.offset().left;
                }

                //dragElm can't leave the screen or the bounding parent on the top
                if ((!isBoundTo && topElmPos < 0) || (isBoundTo && topElmPos < scope.boundTo.offset().top)) {
                  topElmPos = !isBoundTo ? 0 : scope.boundTo.offset().top;

                  if (isBoundTo) {
                    scope.boundTo[0].scrollTop -= 10;
                  }
                }

                //dragElm can't leave the screen on the bottom
                var handleElement = scope.$element.find('.' + config.handleClass);
                var handleHeight = (handleElement && handleElement.length) ? handleElement.height() : 10;

                //dragElm can't leave the screen or the bounding parent on the bottom
                if ((!isBoundTo && (topElmPos + handleHeight) > document_height) ||
                  (scope.boundTo && (topElmPos + handleHeight) >
                  (scope.boundTo.offset().top + scope.boundTo.height()))) {

                  topElmPos = !isBoundTo ? (document_height - handleHeight) : ((scope.boundTo.offset().top + scope.boundTo.height()) - handleHeight);

                  if (isBoundTo) {
                    scope.boundTo[0].scrollTop += 10;
                  }
                }

                //dragElm can't leave the screen on the right
                if ((!isBoundTo &&
                  (leftElmPos + $uiTreeHelper.width(scope.$element)) > document_width) ||
                  (scope.boundTo && (leftElmPos + $uiTreeHelper.width(scope.$element)) >
                  (scope.boundTo.offset().left + scope.boundTo.width()))) {
                  /* jshint maxlen: false */
                  leftElmPos = !isBoundTo ? (document_width - $uiTreeHelper.width(scope.$element)) : ((scope.boundTo.offset().left + scope.boundTo.width()) - $uiTreeHelper.width(scope.$element));
                }

                if (scope.lockY) {
                  dragElm.css({
                    'left': leftElmPos + 'px'
                  });
                } else if (scope.lockX) {
                  dragElm.css({
                    'top': topElmPos + 'px'
                  });
                } else {
                  dragElm.css({
                    'left': leftElmPos + 'px',
                    'top': topElmPos + 'px'
                  });
                }

                var top_scroll = window.pageYOffset || $window.document.documentElement.scrollTop;
                var bottom_scroll = top_scroll + (window.innerHeight || $window.document.clientHeight || $window.document.clientHeight);

                // to scroll down if cursor y-position is greater than the bottom position the vertical scroll
                if (bottom_scroll < eventObj.pageY && bottom_scroll <= document_height) {
                  window.scrollBy(0, 10);
                }

                // to scroll top if cursor y-position is less than the top position the vertical scroll
                if (top_scroll > eventObj.pageY) {
                  window.scrollBy(0, -10);
                }

                $uiTreeHelper.positionMoved(e, pos, firstMoving);
                if (firstMoving) {
                  firstMoving = false;
                  return;
                }

                // move horizontal
                var inTree = isInUiTree(elementFromPoint(e.pageX, e.pageY));
                if (inTree && pos.dirAx && pos.distAxX >= config.levelThreshold) {
                  pos.distAxX = 0;

                  // increase horizontal level if previous sibling exists and is not collapsed
                  if (pos.distX > 0) {
                    prev = dragInfo.prev();
                    if (prev && !prev.collapsed
                      && prev.accept(scope, prev.childNodesCount())) {
                      prev.$childNodesScope.$element.append(placeElm);
                      dragInfo.moveTo(prev.$childNodesScope, prev.childNodes(), prev.childNodesCount());
                    }
                  }

                  // decrease horizontal level
                  if (pos.distX < 0) {
                    // we can't decrease a level if an item preceeds the current one
                    var next = dragInfo.next();
                    if (!next) {
                      var target = dragInfo.parentNode(); // As a sibling of it's parent node
                      if (target
                        && target.$parentNodesScope.accept(scope, target.index() + 1)) {
                        target.$element.after(placeElm);
                        dragInfo.moveTo(target.$parentNodesScope, target.siblings(), target.index() + 1);
                      }
                    }
                  }
                }

                // check if add it as a child node first
                // todo decrease is unused
                var decrease = ($uiTreeHelper.offset(dragElm).left - $uiTreeHelper.offset(placeElm).left) >= config.threshold;
                var targetX = eventObj.pageX - $window.document.body.scrollLeft;
                var targetY = eventObj.pageY - (window.pageYOffset || $window.document.documentElement.scrollTop);

                // Select the drag target. Because IE does not support CSS 'pointer-events: none', it will always
                // pick the drag element itself as the target. To prevent this, we hide the drag element while
                // selecting the target.
                var displayElm;
                if (angular.isFunction(dragElm.hide)) {
                  dragElm.hide();
                } else {
                  displayElm = dragElm[0].style.display;
                  dragElm[0].style.display = "none";
                }

                var targetElm = angular.element(findTargetElement(targetX, targetY, e));

                if (angular.isFunction(dragElm.show)) {
                  dragElm.show();
                } else {
                  dragElm[0].style.display = displayElm;
                }

                // Expanding on drag over 
                // inspecting element under cursor, not nearest element
                var targetElmScope = angular.element(e.target).scope();
                if (targetElmScope && targetElmScope.$type != 'uiTreeHandle') {
                  resetExpandingTimeout();
                }
                else {
                  var startExpandingTimeout = function () {
                    resetExpandingTimeout();
                    dragInfo.$standingTimeout = $timeout(function () {
                      targetElmScope.expand();
                    }, 500);
                    dragInfo.$standingPoint = {
                      x: targetX,
                      y: targetY
                    };
                    dragInfo.$expandingNode = targetElmScope;
                  };

                  if (!dragInfo.$standingTimeout) {
                    startExpandingTimeout();
                  }
                  else {
                    if (dragInfo.$standingTimeout && (dragInfo.$expandingNode != targetElmScope ||
                        geometry.distanceToPoint(targetX, targetY, dragInfo.$standingPoint.x, dragInfo.$standingPoint.y) > 10)) {
                      resetExpandingTimeout();
                    }
                  }
                }

                // move vertical
                if (!pos.dirAx || !inTree) {
                  var targetBefore, targetNode;
                  // check it's new position
                  targetNode = targetElm.scope();
                  var isEmpty = false;
                  if (!targetNode) {
                    return;
                  }
                  if (targetNode.$type == 'uiTree' && targetNode.dragEnabled) {
                    isEmpty = targetNode.isEmpty(); // Check if it's empty tree
                  }
                  if (targetNode.$type == 'uiTreeHandle') {
                    targetNode = targetNode.$nodeScope;
                  }
                  if (targetNode.$type != 'uiTreeNode'
                    && !isEmpty) { // Check if it is a uiTreeNode or it's an empty tree
                    return;
                  }

                  // if placeholder move from empty tree, reset it.
                  if (treeScope && placeElm.parent()[0] != treeScope.$element[0]) {
                    treeScope.resetEmptyElement();
                    treeScope = null;
                  }

                  if (isEmpty) { // it's an empty tree
                    treeScope = targetNode;
                    if (targetNode.$nodesScope.accept(scope, 0)) {
                      targetNode.place(placeElm);
                      dragInfo.moveTo(targetNode.$nodesScope, targetNode.$nodesScope.childNodes(), 0);
                    }
                  } else if (targetNode.dragEnabled()) { // drag enabled
                    targetElm = targetNode.$element; // Get the element of ui-tree-node

                    var targetOffset = $uiTreeHelper.offset(targetElm);
                    var targetMidY = (targetOffset.top + $uiTreeHelper.height(targetElm) / 2);
                    targetBefore = targetNode.horizontal ? eventObj.pageX < (targetOffset.left + $uiTreeHelper.width(targetElm) / 2)
                                                         : eventObj.pageY < targetMidY;

                    if (targetNode.$parentNodesScope.accept(scope, targetNode.index())) {
                      if (addAsChild(e, targetElm) && targetNode.accept(targetNode, targetNode.childNodesCount())) {
                        targetNode.$childNodesScope.$element.append(placeElm);
                        dragInfo.moveTo(targetNode.$childNodesScope, targetNode.childNodes(), targetNode.childNodesCount());
                      }
                      else {
                        if (targetBefore) {
                          targetElm[0].parentNode.insertBefore(placeElm[0], targetElm[0]);
                          dragInfo.moveTo(targetNode.$parentNodesScope, targetNode.siblings(), targetNode.index());
                        } else {
                          targetElm.after(placeElm);
                          dragInfo.moveTo(targetNode.$parentNodesScope, targetNode.siblings(), targetNode.index() + 1);
                        }
                      }
                    }
                    else if (!targetBefore && targetNode.accept(scope, targetNode.childNodesCount())) { // we have to check if it can add the dragging node as a child
                      targetNode.$childNodesScope.$element.append(placeElm);
                      dragInfo.moveTo(targetNode.$childNodesScope, targetNode.childNodes(), targetNode.childNodesCount());
                    }
                  }
                }


                scope.$apply(function () {
                  scope.$callbacks.dragMove(dragInfo.eventArgs(elements, pos));
                });
              }
            };

            var elementFromPoint = function (x, y) {
              // when using elementFromPoint() inside an iframe, you have to call
              // elementFromPoint() twice to make sure IE8 returns the correct value
              $window.document.elementFromPoint(x, y);
              return $window.document.elementFromPoint(x, y);
            };

            var findTargetElement = function (targetX, targetY, e) {
              var dragElmRect = geometry.translateRect(dragInfo.originalRect, geometry.offset(dragInfo.originalPoint, { x: e.pageX, y: e.pageY }));
              var dragElmRectArea = geometry.rectArea(dragElmRect);
              var dragElmCenter = geometry.rectCenter(dragElmRect);

              var overlapPercent = function (rec) {
                var overlapArea = geometry.overlapArea(dragElmRect, rec);
                var percent = Math.floor((overlapArea / dragElmRectArea) * 100);
                return percent;
              };

              // Looking for tree overlapped by drag elm
              var trees = arrayUtils.sortBy(arrayUtils.asArray(document.querySelectorAll('.' + config.treeClass))
                                .map(function (tree) {
                                  var rec = geometry.rect(tree);
                                  return {
                                    node: tree,
                                    nodeRec: rec,
                                    dragElmRec: dragElmRect,
                                    area: overlapPercent(rec)
                                  };
                                })
                                .filter(function (a) {
                                  return a.area > 0;
                                }), function (a) {
                                  return a.area;
                                });

              // If overlapping tree found, fallback to default behaviour
              if (trees.length) {
                // FALLBACK
                return elementFromPoint(targetX, targetY);
              }
              else {
                // Find nearest node or tree
                // 
                var potentialTargets = arrayUtils.sortBy(arrayUtils.asArray(document.querySelectorAll('.' + config.treeClass)), function (node) {
                                              var rec = geometry.rect(node);
                                              return geometry.distanceToPoint(rec.left, rec.top, dragElmRect.left, dragElmRect.top);
                                            });
                if (potentialTargets.length) {
                  var tree = potentialTargets[0];
                  var nodes = arrayUtils.asArray(tree.querySelectorAll("[ui-tree] > [ui-tree-nodes] > [ui-tree-node]"));
                  if (!nodes.length) {
                    return tree;
                  }

                  var node = nodes.map(function (n) {
                                return {
                                  node: n,
                                  rec: geometry.rect(n)
                                };
                              })
                              .filter(function (a) {
                                return a.rec != null;
                              })
                              .sort(function (a) {
                                var dist = geometry.distanceToPoint(a.rec.left, a.rec.top, dragElmRect.left, dragElmRect.top);
                                return dist;
                              })[0].node;

                  return node;
                }

                return null;
              }
            };

            // Returns true if dragging element should be added as child of target element.
            var addAsChild = function (e, targetElement) {
              var targetNode= angular.element(targetElement).scope();
              if(targetNode.childNodesCount() !== 0 || targetNode.collapsed) {
                return false;
              }

              var dragElmRect = geometry.translateRect(dragInfo.originalRect, geometry.offset(dragInfo.originalPoint, { x: e.pageX, y: e.pageY }));
              var targetElmRect = geometry.rect(targetElement[0].children[0]);
              var overlapRectArea = geometry.overlapArea(dragElmRect, targetElmRect);
              var dragElmRectArea = geometry.rectArea(dragElmRect);
              var targetElmRectArea = geometry.rectArea(targetElmRect);
              var overlappingPercent = (Math.max(1, overlapRectArea) / Math.min(dragElmRectArea, targetElmRectArea)) * 100;

              return overlappingPercent > 60;
            };

            var isInUiTree = function (element) {
              if (!element) {
                return false;
              }

              return element.hasAttribute("ui-tree") || isInUiTree(element.parentElement);
            };

            var dragEnd = function (e) {
              e.preventDefault();

              if (dragElm) {
                scope.$treeScope.$apply(function () {
                  scope.$callbacks.beforeDrop(dragInfo.eventArgs(elements, pos));
                });
                // roll back elements changed
                hiddenPlaceElm.replaceWith(scope.$element);
                placeElm.remove();

                dragElm.remove();
                dragElm = null;
                if (scope.$$apply) {
                  dragInfo.apply();
                  scope.$treeScope.$apply(function () {
                    scope.$callbacks.dropped(dragInfo.eventArgs(elements, pos));
                  });
                } else {
                  bindDrag();
                }
                scope.$treeScope.$apply(function () {
                  scope.$callbacks.dragStop(dragInfo.eventArgs(elements, pos));
                });
                scope.$$apply = false;

                if (dragInfo && dragInfo.$standingTimeout) {
                  $timeout.cancel(dragInfo.$standingTimeout);
                }

                dragInfo = null;


              }

              // Restore cursor in Opera 12.16 and IE
              var oldCur = document.body.getAttribute('ui-tree-cursor');
              if (oldCur !== null) {
                $document.find('body').css({ 'cursor': oldCur });
                document.body.removeAttribute('ui-tree-cursor');
              }

              angular.element($document).unbind('touchend', dragEndEvent); // Mobile
              angular.element($document).unbind('touchcancel', dragEndEvent); // Mobile
              angular.element($document).unbind('touchmove', dragMoveEvent); // Mobile
              angular.element($document).unbind('mouseup', dragEndEvent);
              angular.element($document).unbind('mousemove', dragMoveEvent);
              angular.element($window.document.body).unbind('mouseleave', dragCancelEvent);
            };

            var dragStartEvent = function (e) {
              if (scope.dragEnabled()) {
                dragStart(e);
              }
            };

            var dragMoveEvent = function (e) {
              dragMove(e);
            };

            var dragEndEvent = function (e) {
              scope.$$apply = true;
              dragEnd(e);
            };

            var dragCancelEvent = function (e) {
              dragEnd(e);
            };

            var bindDrag = function () {
              element.bind('touchstart mousedown', function (e) {
                dragDelaying = true;
                dragStarted = false;
                dragStartEvent(e);
                dragTimer = $timeout(function () { dragDelaying = false; }, scope.dragDelay);
              });
              element.bind('touchend touchcancel mouseup', function () { $timeout.cancel(dragTimer); });
            };
            bindDrag();

            var resetExpandingTimeout = function () {
              if (dragInfo.$standingTimeout) {
                $timeout.cancel(dragInfo.$standingTimeout);
              }

              dragInfo.$standingTimeout = null;
              dragInfo.$expandingNode = null;
              dragInfo.$standingPoint = null;
            };


            angular.element($window.document.body).bind("keydown", function (e) {
              if (e.keyCode == 27) {
                scope.$$apply = false;
                dragEnd(e);
              }
            });
          }
        };
      }
    ]);

})();

(function () {
  'use strict';

  angular.module('ui.tree')
  .directive('uiTreeHandle', [ 'treeConfig', '$window',
    function(treeConfig) {
      return {
        require: '^uiTreeNode',
        restrict: 'A',
        scope: true,
        controller: 'TreeHandleController',
        link: function(scope, element, attrs, treeNodeCtrl) {
          var config = {};
          angular.extend(config, treeConfig);
          if (config.handleClass) {
            element.addClass(config.handleClass);
          }
          // connect with the tree node.
          if (scope != treeNodeCtrl.scope) {
            scope.$nodeScope = treeNodeCtrl.scope;
            treeNodeCtrl.scope.$handleScope = scope;
          }
        }
      };
    }
  ]);
})();
