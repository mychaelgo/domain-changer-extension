var currentUrl = "";
var currentDomain = "";

$(document).ready(function() {
    resetDomainList();

    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
        currentUrl = replaceProtocol(tabs[0].url);
        currentDomain = currentUrl.substring(0,currentUrl.indexOf("/"));
    });

    $("#addBtn").click(function(e){
        e.stopPropagation();
        saveDomain();
    });

    $("#exportBtn").click(function(e){
        e.stopPropagation();
        exportDomainList();
    });

    $("#importBtn").click(function(e){
        e.stopPropagation();
        $("#importFile").click();
    });

    $("#importFile").change(function(e){
        importDomainList(e.target.files[0]);
    });
});

function attachEvent(){
    $("#domain-list .list-group-item .badge").click(function(e){
        e.stopPropagation();
        removeDomain($(this).parent().attr("id"));
    });

    $("#domain-list .list-group-item").click(function(tab){
        var nextDomain = replaceProtocol($(this).attr("id"));

        currentUrl = currentUrl.replace(currentDomain, nextDomain);

        chrome.tabs.update(tab.id, {url: "http://" + currentUrl}, function(){
            window.close();
        });
    });
}

function replaceProtocol(url){
    return url.replace('http://','').replace('https://','');
}

function saveDomain() {
    if ($("#name").val().length < 1 || $("#domain").val().length < 1) {
        showAlert("Error: No value specified");
        return;
    }

    var setDomain = $("#name").val()+"|"+$("#domain").val();

    chrome.storage.sync.get("domain-changer-list", function(domains) {
        if (!chrome.runtime.error) {
            var getDomains = domains["domain-changer-list"];
            var delimiter;

            if(getDomains == undefined){
                getDomains = "";
                delimiter = "";
            } else {
                delimiter =  getDomains.length > 0 ? "$" : "";
            }

            getDomains = getDomains + delimiter + setDomain;

            chrome.storage.sync.set({"domain-changer-list":getDomains}, function() {
                showAlert("Domain saved");
                $("#name").val("");
                $("#domain").val("");
                resetDomainList();
            });
        }
    });
}

function resetDomainList() {
    $("#domain-list").empty();

    chrome.storage.sync.get("domain-changer-list", function(domains) {
        if (!chrome.runtime.error) {
            var getDomainArray;

            if(domains["domain-changer-list"] == undefined) {
                getDomainArray = new Array();
            } else {
                getDomainArray = domains["domain-changer-list"].split("$").sort();
            }

            getDomainArray.forEach(function(obj){
                var name = obj.split("|")[0];
                var domain = obj.split("|")[1];
                name = name + "  ( "+domain+" )";

                $("#domain-list").append("<a href=\"#\" id=\""+domain+"\" class=\"list-group-item\">"+name+"<span class=\"badge\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=true></span></span></a>");
            });

            attachEvent();
        }
    });
}

function removeDomain(targetDomain) {
    chrome.storage.sync.get("domain-changer-list", function(domains) {
        if (!chrome.runtime.error) {
            var getDomainArray = domains["domain-changer-list"].split("$");

            if(getDomainArray.length < 2) {
                showAlert("Failed: at least 1 domain");
                return;
            }

            var index = 0;
            var Break = new Error('Break');

            try{
                getDomainArray.forEach(function(obj){
                    if(targetDomain === obj.split("|")[1]) {
                        throw Break;
                    }

                    index = index + 1;
                });
            } catch(e) {
                console.log(e);
                console.log(index);
                if (e != Break) {
                    throw e;
                }
            }

            getDomainArray.splice(index, 1);

            var getDomains = getDomainArray.join("$");

            chrome.storage.sync.set({"domain-changer-list":getDomains}, function() {
                resetDomainList();
            });
        }
    });
}

function showAlert(message){
    $("#alert").show("slow");
    $("#alert .alert-info").text(message);

    setTimeout(function(){
        $("#alert").hide("slow");
        $("#alert .alert-info").text("");
    }, 2000);
}

function exportDomainList() {
    chrome.storage.sync.get("domain-changer-list", function(domains) {
        if (!chrome.runtime.error && domains["domain-changer-list"]) {
            var domainList = domains["domain-changer-list"].split("$").sort();
            var blob = new Blob([domainList.join("\n")], { type: 'text/plain' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'domain-list.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            showAlert("Error: No domains to export");
        }
    });
}

function importDomainList(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;
        var importedDomains = contents.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        chrome.storage.sync.get("domain-changer-list", function(domains) {
            if (!chrome.runtime.error) {
                var existingDomains = domains["domain-changer-list"] ? domains["domain-changer-list"].split("$") : [];
                var combinedDomains = existingDomains.concat(importedDomains);
                var uniqueDomains = [...new Set(combinedDomains)];
                chrome.storage.sync.set({"domain-changer-list": uniqueDomains.join("$")}, function() {
                    resetDomainList();
                    showAlert("Domain list imported");
                });
            }
        });
    };
    reader.readAsText(file);
}
