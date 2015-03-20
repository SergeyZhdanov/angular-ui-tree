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
