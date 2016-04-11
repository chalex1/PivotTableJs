
/**
 * Сводная html таблица. Создается объект на основе конфигурации. строится в указанном контейнере с помощью метода htmlPivotTable.buildTable() 
 * @param args: {
 *     container: jQuery - контейнер представления,
 *     numberOfCoordsToRow: Number - количество координат которое пойдет в строку(может отсутствовать Может принимать значение от 1 до coords.length-1 или отсутствовать, тогда будет посчитан автоматически и половина координат уйдет в строки
 *     series: {
 *          values: [{
 *              coords:[Number], - используются в качестве ключей при построении таблицы, если не определена сответствующая coordLinear
 *              coordsCaptions[String], - отображаются в заголовках
 *              coordsLinears[Number|Null], - для линейных осей
 *              data: Number
 *              }]
 *          } - исходный набор данных,
 *     description: string - описание таблицы (может отсутствовать),
 *     title: string - название таблицы (может отсутствовать)
 * } - параметры вызова метода.
 * @returns экземплят htmlPivotTable
 * 
 * @example args = 
 *  series:{
 *   container: jQuery(".someelementclass"),
 *   values: [
 *   {
 *       coords: [95, 2652, 412],
 *       coordsCaptions: ["Санкт-Петербург", "Численность лиц, ищущих убежище", "1 кв 2003"],
 *       coordsLinears: [null, null, 1041368400002],
 *       data: 41
 *   },
 *   {
 *       coords: [95, 554, 103],
 *       coordsCaptions: ["Санкт-Петербург", "мужчин", "2003"],
 *       coordsLinears: [null, null, 1041368400000],
 *       data: 37.3
 *   }
 *  ]
 * }
 * 
 * @author Чунин Александр
 * @version 1.1
 */
function htmlPivotTable(args) {
    var implementation = {};
    /**
     * 
     * Строит html представление таблицы на основе конфигурации в указанном контейнере
     */
    implementation.buildTable = function() {
        try {
            checkParameters();
            calculateLevelOfTableHeader();
            addTitles();
            makeHtmlTable();
            args.container.html(htmlArr.join(''));
        }
        catch (e) {
            console.log(e.message);
        }
    };

    var tableMap = {};
    var namesMap = {}; //для тех вместо имен которых используем sortOrder
    var keysArray = []; //массив всех ключей по уровням
    var htmlArr = [], tbodyArr = [], tbodyElementArr, theadElementArr, tRowElementArr;
    var column = 0;//счетчик листьев в поддеревьях (колонок), какая текущая
    var indexOfsubTree = -1;
    /**
     *уровень дерева, с которого начинается заголовок таблицы. От 1 и до  этого (coordinates counts-1) уровня все в строках 
     */
    var levelOfTableHeader = 0;

    /**
     * Массив с поддеревьями, те что после уровня levelOfTableHeader. Поддеревья имеют полный вид  
     */
    var subTreeArr = {};
    var subTreeRowArr = {};

    var checkParameters = function() {
        if (!args.container) {
            throw new Error('PivotTable: wrong jQuery object at arguments ');
        }
        if (!args.series || !args.series.values || !args.series.values.length || !args.series.values[0] ||
                !args.series.values[0].coords || !args.series.values[0].coords[0] ||
                !args.series.values[0].coordsCaptions || !args.series.values[0].coordsCaptions[0] || !args.series.values[0].coordsLinears) {
            throw new Error("PivotTable: wrong Series object at arguments");
        }
        if (!args.series.values[0].coords[1] ||
                !args.series.values[0].coordsCaptions[1]) {
            throw new Error("PivotTable: values should have at least two coordinates")
        }
    };

    var calculateLevelOfTableHeader = function() {
        args.series.values.forEach(function(value) {
            if (args.numberOfCoordsToRow && args.numberOfCoordsToRow > 0 && args.numberOfCoordsToRow < value.coordsCaptions.length) {
                levelOfTableHeader = args.numberOfCoordsToRow;
            } else {
                levelOfTableHeader = Math.floor(value.coordsCaptions.length / 2);
                levelOfTableHeader = levelOfTableHeader > 1 && levelOfTableHeader < value.coordsCaptions.length - 1 ? levelOfTableHeader : 1;
            }
            return;
        });
    };

    var makeHtmlTable = function() {
        //Note: строим дерево
        //todo: сортировку (порядок) осей
        args.series.values.forEach(function(value) {
            var tpointer = tableMap;
            var mapKey;

            for (var index = 0; index < value.coordsCaptions.length - 1; index++) {
                mapKey = getMapKey(value, index);
                if (!tpointer[mapKey])
                    tpointer[mapKey] = {};
                tpointer = tpointer[mapKey];
                addKeyToKeyArray(mapKey, index);
            }
            mapKey = getMapKey(value, index);
            addKeyToKeyArray(mapKey, index);
            tpointer[mapKey] = value.data;

        });
        //Note: обходим дерево, заполняем поддеревья для заголовка таблицы
        fillUpSubTrees(tableMap, subTreeArr, subTreeRowArr, {}, 0, indexOfsubTree);
        //Note: строим заголовок таблицы
        theadElementArr = [];
        tbodyElementArr = [];
        tRowElementArr = [];
        column = 0;
        htmlHAdd(subTreeArr, 0, theadElementArr, tbodyElementArr);
        //Note: Добавим угловую ячейку
        if (theadElementArr.length > 0) {
            var colspan = " colspan='" + levelOfTableHeader + "' ";
            var rowspan = " rowspan='" + theadElementArr.length + "' ";
            theadElementArr[0].unshift("<td " + colspan + rowspan + ">&nbsp</td>");
        }
        column = 0;
        htmlHRowAdd(subTreeRowArr, tRowElementArr);


        htmlArr.push("<table class='reportHtmlWidget'>");
        htmlArr.push("<thead class='tableHeaderStyle'>");
        for (var i = 0; i < theadElementArr.length; i++) {
            htmlArr.push('<tr>');
            htmlArr.push(theadElementArr[i].join(''));
            htmlArr.push('</tr>');
        }
        htmlArr.push("</thead>");
        htmlArr.push("<tbody>");
        //Note: дополним tbodyarr до полного
        var length = 0;
        for (var i = 0; i < tbodyElementArr.length; i++) {
            if (tbodyElementArr[i].length > length)
                length = tbodyElementArr[i].length;
        }
        for (var i = 0; i < tbodyElementArr.length; i++) {
            tbodyArr[i] = [];
            for (var j = 0; j < length; j++) {
                var style = '';
                if (args.configuration && args.configuration.light && tbodyElementArr[i][j]) {
                    style = getStyleForLightIndication(tbodyElementArr[i][j]);
                }
                tbodyArr[i].push('<td ' + style + ' >');
                if (tbodyElementArr[i][j])
                    tbodyArr[i].push(tbodyElementArr[i][j]);
                tbodyArr[i].push('</td>');
            }
        }
        for (var i = 0; i < tbodyArr.length; i++) {
            htmlArr.push('<tr>');
            htmlArr.push(tRowElementArr[i].concat(tbodyArr[i]).join(''));
            htmlArr.push('</tr>');
        }
        htmlArr.push("</tbody></table>");

    };

    /**
     * 
     * Заполняет поддеревья в массив , после уровня levelOfTableHeader
     * todo убрать дублирование кода из середины после отладки
     */
    var fillUpSubTrees = function(tree, arr, rowarr, pointerOfCurrentSubTree, level, iOfsubTree) {
        if (typeof tree === "object") {
            for (var key in tree) {
                if (level === levelOfTableHeader - 1) {
                    indexOfsubTree = indexOfsubTree + 1;
                }
                var newPointerOfCurrentSubTree = null;
                if (level >= levelOfTableHeader) {
                    if (level === levelOfTableHeader) {
                        pointerOfCurrentSubTree = arr;
                    }
                    if (pointerOfCurrentSubTree[key]) {
                        newPointerOfCurrentSubTree = pointerOfCurrentSubTree[key];
                    }
                    else {
                        if (typeof tree[key] === "object")
                            newPointerOfCurrentSubTree = {};
                        else
                            newPointerOfCurrentSubTree = [];
                        pointerOfCurrentSubTree[key] = newPointerOfCurrentSubTree;
                    }

                } else {
                    if (level === 0) {
                        pointerOfCurrentSubTree = rowarr;
                    }
                    if (pointerOfCurrentSubTree[key]) {
                        newPointerOfCurrentSubTree = pointerOfCurrentSubTree[key];
                    }
                    else {
                        if (typeof tree[key] === "object")
                            newPointerOfCurrentSubTree = {};
                        else
                            newPointerOfCurrentSubTree = [];
                        pointerOfCurrentSubTree[key] = newPointerOfCurrentSubTree;
                    }
                }
                fillUpSubTrees(tree[key], arr, rowarr, newPointerOfCurrentSubTree, level + 1, indexOfsubTree);
            }

        } else {
            var val = tree;
            pointerOfCurrentSubTree[iOfsubTree] = val;
        }
    };

    var getMapKey = function(value, index) {
        var mapKey;
        if (value.coordsLinears[index] !== null) {//(false) { /*was . don't remember why. chalex
            mapKey = value.coordsLinears[index];
            namesMap[mapKey] = value.coordsCaptions[index];
        }
        else {
            mapKey = value.coords[index];
            namesMap[mapKey] = value.coordsCaptions[index];
        }
        return mapKey;
    };
    var addKeyToKeyArray = function(key, level) {
        if (!keysArray[level]) {
            keysArray[level] = {};
        }
        keysArray[level][key] = '';
    };


    var htmlHAdd = function(objectPointer, level, elemArray, rowArray) {
        if (typeof objectPointer === "object" && !objectPointer.length) {//checking on object and not an array
            //sorting
            var sortedKeysOfOneLevel = Object.keys(objectPointer);
            if (!isNaN(sortedKeysOfOneLevel[0])) {
                sortedKeysOfOneLevel.sort(function(a, b) {
                    return a - b;
                });
            }
            for (var subelemindex = 0; subelemindex < sortedKeysOfOneLevel.length; subelemindex++) {
                if (!elemArray[level]) {
                    elemArray[level] = [];
//                        elemArray[level].push('<td>&nbsp</td>');
                }
                elemArray[level].push('<td ');
                var curAmount = 0;
                if (typeof objectPointer[sortedKeysOfOneLevel[subelemindex]] === "object" && !objectPointer[sortedKeysOfOneLevel[subelemindex]].length) {
                    curAmount = getAmountLeavesofLastLevel(objectPointer[sortedKeysOfOneLevel[subelemindex]]);
                }
                if (curAmount > 1)
                {
                    elemArray[level].push("colspan='" + curAmount + "' ");
                }
                elemArray[level].push('>');
                elemArray[level].push(replaceSortNumberByName(namesMap, sortedKeysOfOneLevel[subelemindex]));
                elemArray[level].push('</td>');

                htmlHAdd(objectPointer[sortedKeysOfOneLevel[subelemindex]], level + 1, elemArray, rowArray);
            }
        } else if (typeof objectPointer === "object" && rowArray) {
            for (var i = 0; i < objectPointer.length; i++) {
                if (!rowArray[i]) {
                    rowArray[i] = [];
                }

                rowArray[i][column] = objectPointer[i];
            }
            column += 1;
        }
    };
    //todo: one function, because it's similar to htmlHAdd()
    var htmlHRowAdd = function(objectPointer, elemArray) {
        if (typeof objectPointer === "object" && !objectPointer.length) {//checking on object and not an array
            //sorting
            var sortedKeysOfOneLevel = Object.keys(objectPointer);
            if (!isNaN(sortedKeysOfOneLevel[0])) {
                sortedKeysOfOneLevel.sort(function(a, b) {
                    return a - b;
                });
            }
            if (sortedKeysOfOneLevel.length === 0) {
                column += 1;
            }
            for (var subelemindex = 0; subelemindex < sortedKeysOfOneLevel.length; subelemindex++) {
                if (!elemArray[column]) {
                    elemArray[column] = [];
                }
                elemArray[column].push("<td class='tableHeaderStyle' ");
                var curAmount = 0;
                if (typeof objectPointer[sortedKeysOfOneLevel[subelemindex]] === "object") {
                    curAmount = getAmountLeavesofLastLevel(objectPointer[sortedKeysOfOneLevel[subelemindex]]);
                }
                if (curAmount > 1)
                {
                    elemArray[column].push("rowspan ='" + curAmount + "' ");
                }
                elemArray[column].push('>');
                elemArray[column].push(replaceSortNumberByName(namesMap, sortedKeysOfOneLevel[subelemindex]));
                elemArray[column].push('</td>');

                htmlHRowAdd(objectPointer[sortedKeysOfOneLevel[subelemindex]], elemArray);
            }
        }
    };

    var getAmountLeavesofLastLevel = function(pointer) {
        var currentAmount = 0;
        var currentLastAmount = 0;

        for (var key in pointer) {
            if (typeof pointer[key] === "object" && !pointer[key].length && Object.keys(pointer[key]).length > 0) {
                currentAmount = currentAmount + getAmountLeavesofLastLevel(pointer[key]);
            } else {
                currentLastAmount = currentLastAmount + 1;
            }
        }
        if (currentAmount === 0) {
            currentAmount = currentLastAmount;
        }
        return currentAmount;
    };

    var replaceSortNumberByName = function(namesMap, sortN) {
        var name = sortN;
        if (namesMap[sortN]) {
            name = namesMap[sortN];
        }
        return name;
    };

    var addTitles = function() {
        if (args.title) {
            htmlArr.push("<span class='table-info-title'>", args.title, "</span>");
        }
        if (args.description) {
            htmlArr.push("<span class='table-info-description'>", args.description, "</span>");
        }
    };


    return implementation;
}

  
