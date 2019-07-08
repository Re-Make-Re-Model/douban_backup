// ==UserScript==
// @name          douban_book_Lib
// @namespace     https://www.douban.com/people/57965364/douban_book
// @description   douban_book library
// @include       *
// @match         *
// @version       0.0.1
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// ==/UserScript==
var uid;
var count = 0;
var db_collect;
var db_wish;
var db_do;
var save_As;
var html_Docx;
function downloadBooks(userid, db_c, db_w, db_d, save_as, html_docx) {
    uid = userid;
    db_collect = db_c;
    db_wish = db_w;
    db_do = db_d;
    save_As = save_as;
    html_Docx = html_docx;
    tempAlert("开始读书备份", 2000);
    collectionsUrl = "https://book.douban.com/people/" + uid + "/collect";
    getBookPage(collectionsUrl, db_collect, "豆瓣读书（已读）");
}

// 采集当前页数据，保存到indexedDB
function getBookPage(link, db, filename) {
    fetch(link).then(res => res.text())
        .then(text => new DOMParser().parseFromString(text, 'text/html'))
        .then(function (data) {
            var items = getCurrentPageListBook(data);
            db.items.bulkAdd(items).then(function () {
                setTimeout(function () {
                    console.log(link + '保存成功');
                    // 获取下一页链接
                    var nextUrl;
                    if (data.getElementsByClassName("next").length != 0 &&
                        data.getElementsByClassName("next")[0].getElementsByTagName("a")[0] != null) {
                        nextUrl = data.getElementsByClassName("next")[0].getElementsByTagName("a")[0].href;
                        getBookPage(nextUrl, db, filename);
                    } else {
                        exportAllBook(db, filename)
                    }
                }, 1000);
            }).catch(function (error) {
                console.log("Ooops: " + error);
            });
        }, function (error) {
            console.log(error.message);
        })
}

// 获取当前页数据
function getCurrentPageListBook(pagedocument) {
    var items = [];
    var books = pagedocument.getElementsByClassName("subject-item");
    [].forEach.call(books, function (book) {
        var titleElement = book.getElementsByClassName("info")[0].getElementsByTagName("h2")[0].getElementsByTagName("a")[0];
        var title = titleElement.innerText.trim() || titleElement.textContent.trim();
        var pub = book.getElementsByClassName("info")[0].getElementsByClassName("pub")[0].innerHTML.trim();
        var rating;
        if (book.getElementsByClassName("info")[0].getElementsByClassName("short-note")[0]
            .getElementsByTagName('div')[0].getElementsByTagName("span").length > 1) {
            rating = book.getElementsByClassName("info")[0].getElementsByClassName("short-note")[0]
                .getElementsByTagName('div')[0].getElementsByTagName("span")[0].getAttribute("class").slice(6, 7);
        } else {
            rating = '';
        }
        var date = book.getElementsByClassName("info")[0].getElementsByClassName("short-note")[0]
            .getElementsByTagName('div')[0].getElementsByClassName("date")[0].innerHTML.trim();
        var tags;
        if (book.getElementsByClassName("info")[0].getElementsByClassName("short-note")[0]
            .getElementsByTagName('div')[0].getElementsByClassName("tags")[0]) {
            tags = book.getElementsByClassName("info")[0].getElementsByClassName("short-note")[0]
                .getElementsByTagName('div')[0].getElementsByClassName("tags")[0].innerHTML.trim();
        } else {
            tags = "";
        }

        var link = book.getElementsByClassName("info")[0].getElementsByTagName("h2")[0].getElementsByTagName("a")[0].getAttribute("href");
        var comment = book.getElementsByClassName("info")[0].getElementsByClassName("short-note")[0].getElementsByClassName("comment")[0].innerHTML.trim();
        items.push({
            "title": title,
            "pub": pub,
            "rating": rating,
            "date": date,
            "tags": tags,
            "link": link,
            "comment": comment
        })
    });
    return items;
}

function exportAllBook(db, file_name) {
    db.items.orderBy('date').toArray().then(function (all) {
        all = all.map(function (item, index, array) {
            delete item.id;
            return item;
        })

        JSonToCSV.setDataConver({
            data: all,
            fileName: file_name,
            columns: {
                title: ['标题', '出版信息', '个人评分', '标记日期', '标签', '条目链接', '评论'],
                key: ['title', 'pub', 'rating', 'date', "tags", 'link', 'comment']
            }
        });
        db.delete();
        tempAlert(file_name + ": 备份成功", 2000);
        count++;
        if (count == 1) {
            wishsUrl = "https://book.douban.com/people/" + uid + "/wish";
            getBookPage(wishsUrl,db_wish, "豆瓣读书（想读）");
        } else if (count == 2) {
            dosUrl = "https://book.douban.com/people/" + uid + "/do";
            getBookPage(dosUrl, db_do, "豆瓣读书（在读）");
        } else {
            tempAlert("读书全部备份成功，开始备份书评（如果有的话）");
            reviewLing = "https://book.douban.com/people/" + uid + "/reviews";
            parseReviewsPage(reviewLing, "书评");
        }
    });
}

function parseReviewsPage(url, reviewText) {
    fetch(url).then(res => res.text())
        .then(text => new DOMParser().parseFromString(text, 'text/html'))
        .then(function (data) {
            var nextUrl;
            if (data.getElementsByClassName("next").length != 0 &&
                data.getElementsByClassName("next")[0].getElementsByTagName("a")[0] != null) {
                nextUrl = data.getElementsByClassName("next")[0].getElementsByTagName("a")[0].href;
            }
            var reviewLists = data.getElementsByClassName("nlst");
            if (reviewLists.length == 0) {
                alert("没有" + reviewText);
                return;
            }
            var complete = 0;
            [].forEach.call(reviewLists, function (reviewLink, index) {
                setTimeout(function () {
                    downloadReview(reviewLink.getElementsByTagName("h3")[0].getElementsByTagName("a")[0].getAttribute("href"), function () {
                        complete++;
                        if (complete == reviewLists.length) {
                            if (nextUrl != null) {
                                console.log("开始备份" + nextUrl);
                                parseReviewsPage(nextUrl);
                            } else {
                                alert(reviewText + "全部备份完成");
                            }
                        }
                    });
                }, 1000 * index);
            })
        }, function (error) {
            console.log(error.message);
        })
}

function downloadReview(url, callback) {
    fetch(url).then(res => res.text())
        .then(text => new DOMParser().parseFromString(text, 'text/html'))
        .then(function (document) {
            var contentDocument = document.getElementsByClassName("article")[0];
            var title = document.getElementsByTagName("h1")[0].getElementsByTagName("span")[0].innerHTML;
            var regularImages = contentDocument.querySelectorAll("img");
            var numOfImage = regularImages.length;
            if (numOfImage == 0) {
                var converted = html_Docx.asBlob("\uFEFF" + contentDocument.innerHTML);
                save_As(converted, title + ".docx");
                if (callback && typeof (callback) === "function")
                    callback();
            } else {
                var flag = 0;
                [].forEach.call(regularImages, function (imgElement) {
                    const w = imgElement.width;
                    const h = imgElement.height;
                    imgElement.width = w;
                    imgElement.height = h;
                    if (imgElement.src.endsWith('.webp')) {
                        imgElement.src = imgElement.src.replace('.webp', '.jpg');
                    }
                    getDataUrlBySrc(imgElement.src).then(function (b64) {
                        imgElement.src = b64;
                        flag++;
                        if (flag === numOfImage) {
                            var converted = html_Docx.asBlob("\uFEFF" + contentDocument.innerHTML);
                            save_As(converted, title + ".docx");
                            if (callback && typeof (callback) === "function")
                                callback();
                        }
                    });
                })
            };
        }, function (error) {
            console.log(error.message);
        });
}

function getDataUrlBySrc(src) {
	return new Promise(function (resolve, reject) {
		GM_xmlhttpRequest({
			method: "GET",
			url: src,
			responseType: 'arraybuffer',
			onload: function (res) {
				const arr = new Uint8Array(res.response);
				const raw = Array.prototype.map
				.call(arr, charCode => String.fromCharCode(charCode))
				.join("");
				const b64 = btoa(raw);
				const dataURL = "data:image/jpeg;base64," + b64;
				resolve(dataURL);
			},
			onerror:function(err){
				reject(err);
			}
		});
	});
}


// 导出CSV函数
// https://github.com/liqingzheng/pc/blob/master/JsonExportToCSV.js
var JSonToCSV = {
    /*
     * obj是一个对象，其中包含有：
     * ## data 是导出的具体数据
     * ## fileName 是导出时保存的文件名称 是string格式
     * ## showLabel 表示是否显示表头 默认显示 是布尔格式
     * ## columns 是表头对象，且title和key必须一一对应，包含有
          title:[], // 表头展示的文字
          key:[], // 获取数据的Key
          formatter: function() // 自定义设置当前数据的 传入(key, value)
     */
    setDataConver: function (obj) {
        var bw = this.browser();
        if (bw['ie'] < 9) return; // IE9以下的
        var data = obj['data'],
            ShowLabel = typeof obj['showLabel'] === 'undefined' ? true : obj['showLabel'],
            fileName = (obj['fileName'] || 'UserExport') + '.csv',
            columns = obj['columns'] || {
                title: [],
                key: [],
                formatter: undefined
            };
        ShowLabel = typeof ShowLabel === 'undefined' ? true : ShowLabel;
        var row = "", CSV = '', key;
        // 如果要现实表头文字
        if (ShowLabel) {
            // 如果有传入自定义的表头文字
            if (columns.title.length) {
                columns.title.map(function (n) {
                    row += n + ',';
                });
            } else {
                // 如果没有，就直接取数据第一条的对象的属性
                for (key in data[0]) row += key + ',';
            }
            row = row.slice(0, -1); // 删除最后一个,号，即a,b, => a,b
            CSV += row + '\r\n'; // 添加换行符号
        }
        // 具体的数据处理
        data.map(function (n) {
            row = '';
            // 如果存在自定义key值
            if (columns.key.length) {
                columns.key.map(function (m) {
                    row += '"' + (typeof columns.formatter === 'function' ? columns.formatter(m, n[m]) || n[m] : n[m]) + '",';
                });
            } else {
                for (key in n) {
                    row += '"' + (typeof columns.formatter === 'function' ? columns.formatter(key, n[key]) || n[key] : n[key]) + '",';
                }
            }
            row.slice(0, row.length - 1); // 删除最后一个,
            CSV += row + '\r\n'; // 添加换行符号
        });
        if (!CSV) return;
        this.SaveAs(fileName, CSV);
    },
    SaveAs: function (fileName, csvData) {
        var bw = this.browser();
        if (!bw['edge'] || !bw['ie']) {
            var alink = document.createElement("a");
            alink.id = "linkDwnldLink";
            alink.href = this.getDownloadUrl(csvData);
            document.body.appendChild(alink);
            var linkDom = document.getElementById('linkDwnldLink');
            linkDom.setAttribute('download', fileName);
            linkDom.click();
            document.body.removeChild(linkDom);
        }
        else if (bw['ie'] >= 10 || bw['edge'] == 'edge') {
            var _utf = "\uFEFF";
            var _csvData = new Blob([_utf + csvData], {
                type: 'text/csv'
            });
            navigator.msSaveBlob(_csvData, fileName);
        }
        else {
            var oWin = window.top.open("about:blank", "_blank");
            oWin.document.write('sep=,\r\n' + csvData);
            oWin.document.close();
            oWin.document.execCommand('SaveAs', true, fileName);
            oWin.close();
        }
    },
    getDownloadUrl: function (csvData) {
        var _utf = "\uFEFF"; // 为了使Excel以utf-8的编码模式，同时也是解决中文乱码的问题
        if (window.Blob && window.URL && window.URL.createObjectURL) {
            csvData = new Blob([_utf + csvData], {
                type: 'text/csv'
            });
            return URL.createObjectURL(csvData);
        }
        // return 'data:attachment/csv;charset=utf-8,' + _utf + encodeURIComponent(csvData);
    },
    browser: function () {
        var Sys = {};
        var ua = navigator.userAgent.toLowerCase();
        var s;
        (s = ua.indexOf('edge') !== - 1 ? Sys.edge = 'edge' : ua.match(/rv:([\d.]+)\) like gecko/)) ? Sys.ie = s[1] :
            (s = ua.match(/msie ([\d.]+)/)) ? Sys.ie = s[1] :
                (s = ua.match(/firefox\/([\d.]+)/)) ? Sys.firefox = s[1] :
                    (s = ua.match(/chrome\/([\d.]+)/)) ? Sys.chrome = s[1] :
                        (s = ua.match(/opera.([\d.]+)/)) ? Sys.opera = s[1] :
                            (s = ua.match(/version\/([\d.]+).*safari/)) ? Sys.safari = s[1] : 0;
        return Sys;
    }
};

function tempAlert(msg, duration) {
    var el = document.createElement("div");
    el.setAttribute("style", "position:absolute;top:50%;left:50%;background-color:#83BF73;padding:20px");
    el.innerHTML = msg;
    setTimeout(function () {
        el.parentNode.removeChild(el);
    }, duration);
    document.body.appendChild(el);
}