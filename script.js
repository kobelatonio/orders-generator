let address = [];
let tableData = [];
updateButton();
initializeAddress();

function upload() {
    let formFile = document.querySelector('#file');
    let files = formFile.files;
    
    if (!files) {
        alert("This browser doesn't seem to support the `files` property of file inputs.");
    } else if (!files[0]) {
        alert("No file selected.");
    } else {
        document.querySelector('.loading').classList = 'd-block loading';
        document.querySelector('.table-header').innerHTML = '';
        document.querySelector('.table-body').innerHTML = '';
        tableData = [['#', 'Order Number', 'Receiver', 'Receiver Telephone', 'Receiver Address', 'Receiver Province', 'Receiver City', 'Receiver Region', 'Express Type', 'Parcel Name', 'Weight', 'Total Parcels', 'Parcel Value', 'COD', 'Remarks']];

        for (let i = 0; i < files.length; i++) {
            let fr = new FileReader();
            let file = files.item(i);
            fr.onload = processFile;
            fr.readAsText(file);

            function processFile() {
                let raw = $.csv.toArrays(fr.result);
                processData(raw);

                if (i === files.length - 1) {
                    createTable();
                    document.querySelector('.loading').classList = 'd-none loading';
                }
            }
        }
    }
}

function processData(raw) {
    let data = [];

    let includeOrders = document.querySelector('#includeOrders').value.split(' ');
    let excludeNames = document.querySelector('#excludeNames').value.split(' ');
    let overrideExcludeNames = document.querySelector('#overrideExcludeNames').value.split(' ');
    let excludeOrders = document.querySelector('#excludeOrders').value.split(' ');

    let combineOrders = document.querySelector('#combineOrders').value.split(' ');
    let combinedOrders = [];
    combineOrders.forEach((it, index) => {
        let parts = it.split('=');
        combinedOrders[index] = [];
        combinedOrders[index][0] = parts[0].split(',');
        combinedOrders[index][1] = parts[1];
    });

    for (var i = 1; i < raw.length; i++) {
        let orderNumber = raw[i][0].substring(8);

        if (excludeNames.some(it => raw[i][34].includes(it)) && !overrideExcludeNames.includes(orderNumber)) {
            continue;
        }

        if (excludeOrders.includes(orderNumber)) {
            continue;
        }
        
        if (raw[i][2] == 'voided' || raw[i][2] == '') {
            continue;
        }

        let isAlreadyCombined = false;
        let groupDetails = [];
        combinedOrders.forEach(it => {
            if (it[0].includes(orderNumber)) {
                if (it[0].indexOf(orderNumber) === 0) {
                    groupDetails = it;
                } else {
                    isAlreadyCombined = true;
                }
            }
        });

        if (isAlreadyCombined) {
            continue;
        }

        if (includeOrders[0] != '') {
            let isIncluded = false;
    
            includeOrders.forEach(it => {
                if (it.includes('-')) {
                    let range = it.split('-');
                    if (orderNumber >= range[0] && orderNumber <= range[1]) {
                        isIncluded = true;
                    }
                } else if (orderNumber == it) {
                    isIncluded = true;
                }
            });
    
            if (!isIncluded) {
                continue;
            }
        }

        let row = [];

        // Order Number
        row.push(orderNumber);

        // Receiver
        row.push(convertToTitleCase(raw[i][34]));

        // Receiver Telephone
        row.push(formatPhoneNumber(raw[i][43]));

        // Receiver Address
        row.push(raw[i][35]);

        // Receiver Province
        row.push(getProvince(raw[i][41]));
        
        // Receiver City
        row.push('');
        
        // Receiver Region
        row.push('');

        // Express Type
        row.push('EZ');

        // Parcel Name
        row.push('QUINTAS ACCESSORIES');

        // Weight
        row.push('0.50');

        // Total Parcels
        let count = 0;
        let rows = 0;

        for (var j = 0; j < raw.length; j++) {
            if (raw[i + j] == null) {
                break;
            } else if (j > 0 && raw[i + j][13] != "") {
                break;
            } else if (raw[i + j][17] != 'Tip') {
                count += parseInt(raw[i + j][16]);
            }

            rows++;
        }

        if (groupDetails.length > 0) {
            groupDetails[0].forEach((item, index) => {
                if (index === 0) {
                    return;
                }

                let row = raw.find(it => it[0].includes(item));
                let rowIndex = raw.indexOf(row);

                for (var j = 0; j < raw.length; j++) {
                    if (raw[rowIndex + j] == null) {
                        break;
                    } else if (j > 0 && raw[rowIndex + j][13] != "") {
                        break;
                    } else if (raw[rowIndex + j][17] != 'Tip') {
                        count += parseInt(raw[rowIndex + j][16]);
                    }
                }
            });
        }

        row.push(count);

        // Parcel Value
        row.push('549');

        // COD
        let cod;
        if (groupDetails.length > 0) {
            cod = raw[i][2] == 'paid' ? "0" : groupDetails[1];
        } else {
            cod = raw[i][2] == 'paid' ? "0" : raw[i][11];
        }
        row.push(cod);

        // Remarks
        row.push('VIP');

        data.push(row);
        
        i += (rows - 1);
    }

    tableData = [...tableData, ...data]
}

function createTable() {
    var table = document.createElement('table');
    var tableHead = document.createElement('thead');
    var tableBody = document.createElement('tbody');

    var rowHead = document.createElement('tr');

    tableData[0].forEach((cellData, index) => {
        var cell = document.createElement('th');

        if ([5, 6, 7].includes(index)) {
            cell.classList = 'text-nowrap';
        }

        cell.appendChild(document.createTextNode(cellData));
        rowHead.appendChild(cell);
    });

    tableHead.appendChild(rowHead);

    let province;
    let city;

    tableData.sort((a, b) => a[0] - b[0]);

    tableData.forEach((it, index) => {
        if (index > 0) {
            it.unshift(index);
        }
    });

    tableData.forEach((rowData, index) => {
        if (index === 0) {
            return;
        }

        let row = document.createElement('tr');
        let currentIndex = index;

        rowData.forEach((cellData, columnIndex) => {
            var cell = document.createElement('td');
            
            if (columnIndex === 5) {
                var select = document.createElement('select');
                address.forEach(it => {
                    let option = document.createElement('option');
                    option.value = it.province;
                    option.innerHTML = it.province;
                    option.selected = cellData === it.province;
                    select.appendChild(option);
                });

                select.dataset.row = currentIndex;
                select.dataset.col = 4;
                select.setAttribute('onchange', 'onProvinceChange(' + currentIndex + ')');

                province = cellData;
                tableData[index][5] = select.value;
                cell.appendChild(select);
            } else if (columnIndex === 6) {
                var select = document.createElement('select');

                let selectedProvince = address.find(it => it.province == province);
                selectedProvince.cities.forEach(it => {
                    let option = document.createElement('option');
                    option.value = it.city;
                    option.innerHTML = it.city;
                    select.appendChild(option);
                });

                select.dataset.row = currentIndex;
                select.dataset.col = 5;
                select.setAttribute('onchange', 'onCityChange(' + currentIndex + ')');

                city = select.value;
                tableData[index][6] = select.value;
                cell.appendChild(select);
            } else if (columnIndex === 7) {
                var select = document.createElement('select');

                let selectedProvince = address.find(it => it.province == province);
                let selectedCity = selectedProvince.cities.find(it => it.city == city);
                selectedCity.barangays.forEach(it => {
                    let option = document.createElement('option');
                    option.value = it;
                    option.innerHTML = it;
                    select.appendChild(option);
                });

                select.dataset.row = currentIndex;
                select.dataset.col = 6;
                select.setAttribute('onchange', 'onBarangayChange(' + currentIndex + ')');

                tableData[index][7] = select.value;
                cell.appendChild(select);
            } else {
                cell.appendChild(document.createTextNode(cellData));
            }

            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    table.appendChild(tableHead);
    table.appendChild(tableBody);
    table.classList.add('table');
    table.classList.add('table-striped');

    let button = document.createElement('button');
    button.classList = 'btn btn-success';
    button.innerHTML = 'Export CSV';
    button.setAttribute('onclick', 'exportCsv()');

    let tableHeader = document.querySelector('.table-header');
    tableHeader.appendChild(button);
    tableHeader.appendChild(document.createTextNode((tableData.length - 1) + ' orders'));

    let tableContent = document.querySelector('.table-body');
    tableContent.appendChild(table);

    $('select').select2();
}

function onProvinceChange(index) {
    let provinceSelect = document.querySelector('[data-row="' + index + '"][data-col="4"]');
    let citySelect = document.querySelector('[data-row="' + index + '"][data-col="5"]');
    let barangaySelect = document.querySelector('[data-row="' + index + '"][data-col="6"]');

    citySelect.innerHTML = "";
    barangaySelect.innerHTML = "";

    let selectedProvince = address.find(it => it.province == provinceSelect.value);
    selectedProvince.cities.forEach(it => {
        let option = document.createElement('option');
        option.value = it.city;
        option.innerHTML = it.city;
        citySelect.appendChild(option);
    });

    let selectedCity = selectedProvince.cities.find(it => it.city == citySelect.value);
    selectedCity.barangays.forEach(it => {
        let option = document.createElement('option');
        option.value = it;
        option.innerHTML = it;
        barangaySelect.appendChild(option);
    });

    tableData[index][5] = provinceSelect.value;
    tableData[index][6] = citySelect.value;
    tableData[index][7] = barangaySelect.value;
}

function onCityChange(index) {
    let provinceSelect = document.querySelector('[data-row="' + index + '"][data-col="4"]');
    let citySelect = document.querySelector('[data-row="' + index + '"][data-col="5"]');
    let barangaySelect = document.querySelector('[data-row="' + index + '"][data-col="6"]');

    barangaySelect.innerHTML = "";

    let selectedProvince = address.find(it => it.province == provinceSelect.value);
    let selectedCity = selectedProvince.cities.find(it => it.city == citySelect.value);
    selectedCity.barangays.forEach(it => {
        let option = document.createElement('option');
        option.value = it;
        option.innerHTML = it;
        barangaySelect.appendChild(option);
    });

    tableData[index][6] = citySelect.value;
    tableData[index][7] = barangaySelect.value;
}

function onBarangayChange(index) {
    let barangaySelect = document.querySelector('[data-row="' + index + '"][data-col="6"]');
    tableData[index][7] = barangaySelect.value;
}

function exportCsv() {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < tableData.length; i++) {
        csvFile += processRow(tableData[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, 'orders.csv');
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", 'orders.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

function convertToTitleCase(str) {
    var name = str; 
    name = name.replace('(FB) ', '');
    name = name.replace('(IG) ', '');
    name = name.replace('(GRAB) ', '');

    var splitStr = name.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }

    return splitStr.join(' '); 
}

function formatPhoneNumber(str) {
    let number = str;
    number = number.replace(/ /g, '');
    number = number.replace(/'/g, '');
    number = number.replace(/-/g, '');
    number = number.replace(/\+/g, '');
    number = number.replace(/[\])}[{(]/g, '');

    if (number.startsWith("9", 0)) {
        number = '0' + number;
    }

    if (number.startsWith("63", 0)) {
        number = '0' + number.substring(2);
    }

    return number;
}

function updateButton() {
    if(document.getElementById("file").value === "") { 
        document.getElementById('uploadButton').disabled = true; 
    } else { 
        document.getElementById('uploadButton').disabled = false;
    }
}

function getProvince(str) {
    switch(str) {
        case 'PH-ABR': return 'ABRA'; break;
        case 'PH-AGN': return 'AGUSAN-DEL-NORTE'; break;
        case 'PH-AGS': return 'AGUSAN-DEL-SUR'; break;
        case 'PH-AKL': return 'AKLAN'; break;
        case 'PH-ALB': return 'ALBAY'; break;
        case 'PH-ANT': return 'ANTIQUE'; break;
        case 'PH-APA': return 'APAYAO'; break;
        case 'PH-AUR': return 'AURORA'; break;
        case 'PH-BAS': return 'BASILAN'; break;
        case 'PH-BAN': return 'BATAAN'; break;
        case 'PH-BTN': return 'BATANES'; break;
        case 'PH-BTG': return 'BATANGAS'; break;
        case 'PH-BEN': return 'BENGUET'; break;
        case 'PH-BIL': return 'BILIRAN'; break;
        case 'PH-BOH': return 'BOHOL'; break;
        case 'PH-BUK': return 'BUKIDNON'; break;
        case 'PH-BUL': return 'BULACAN'; break;
        case 'PH-CAG': return 'CAGAYAN'; break;
        case 'PH-CAN': return 'CAMARINES-NORTE'; break;
        case 'PH-CAS': return 'CAMARINES-SUR'; break;
        case 'PH-CAM': return 'CAMIGUIN'; break;
        case 'PH-CAP': return 'CAPIZ'; break;
        case 'PH-CAT': return 'CATANDUANES'; break;
        case 'PH-CAV': return 'CAVITE'; break;
        case 'PH-CEB': return 'CEBU'; break;
        case 'PH-NCO': return 'COTABATO'; break;
        case 'PH-COM': return 'COMPOSTELA-VALLEY'; break;
        case 'PH-DAV': return 'DAVAO-DEL-NORTE'; break;
        case 'PH-DAS': return 'DAVAO-DEL-SUR'; break;
        case 'PH-DVO': return 'DAVAO-DEL-SUR'; break;
        case 'PH-DAO': return 'DAVAO-ORIENTAL'; break;
        case 'PH-DIN': return 'DINAGAT-ISLANDS'; break;
        case 'PH-EAS': return 'EASTERN-SAMAR'; break;
        case 'PH-GUI': return 'GUIMARAS'; break;
        case 'PH-IFU': return 'IFUGAO'; break;
        case 'PH-ILN': return 'ILOCOS-NORTE'; break;
        case 'PH-ILS': return 'ILOCOS-SUR'; break;
        case 'PH-ILI': return 'ILOILO'; break;
        case 'PH-ISA': return 'ISABELA'; break;
        case 'PH-KAL': return 'KALINGA'; break;
        case 'PH-LUN': return 'LA-UNION'; break;
        case 'PH-LAG': return 'LAGUNA'; break;
        case 'PH-LAN': return 'LANAO-DEL-NORTE'; break;
        case 'PH-LAS': return 'LANAO-DEL-SUR'; break;
        case 'PH-LEY': return 'LEYTE'; break;
        case 'PH-MAG': return 'MAGUINDANAO'; break;
        case 'PH-MAD': return 'MARINDUQUE'; break;
        case 'PH-MAS': return 'MASBATE'; break;
        case 'PH-00': return 'METRO-MANILA'; break;
        case 'PH-MSC': return 'MISAMIS-OCCIDENTAL'; break;
        case 'PH-MSR': return 'MISAMIS-ORIENTAL'; break;
        case 'PH-MOU': return 'MOUNTAIN-PROVINCE'; break;
        case 'PH-NEC': return 'NEGROS-OCCIDENTAL'; break;
        case 'PH-NER': return 'NEGROS-ORIENTAL'; break;
        case 'PH-NSA': return 'NORTHERN-SAMAR'; break;
        case 'PH-NUE': return 'NUEVA-ECIJA'; break;
        case 'PH-NUV': return 'NUEVA-VIZCAYA'; break;
        case 'PH-MDC': return 'OCCIDENTAL-MINDORO'; break;
        case 'PH-MDR': return 'ORIENTAL-MINDORO'; break;
        case 'PH-PLW': return 'PALAWAN'; break;
        case 'PH-PAM': return 'PAMPANGA'; break;
        case 'PH-PAN': return 'PANGASINAN'; break;
        case 'PH-QUE': return 'QUEZON'; break;
        case 'PH-QUI': return 'QUIRINO'; break;
        case 'PH-RIZ': return 'RIZAL'; break;
        case 'PH-ROM': return 'ROMBLON'; break;
        case 'PH-WSA': return 'WESTERN-SAMAR'; break;
        case 'PH-SAR': return 'SARANGANI'; break;
        case 'PH-SIG': return 'SIQUIJOR'; break;
        case 'PH-SOR': return 'SORSOGON'; break;
        case 'PH-SCO': return 'SOUTH-COTABATO'; break;
        case 'PH-SLE': return 'SOUTHERN-LEYTE'; break;
        case 'PH-SUK': return 'SULTAN KUDARAT'; break;
        case 'PH-SLU': return 'SULU'; break;
        case 'PH-SUN': return 'SURIGAO-DEL-NORTE'; break;
        case 'PH-SUR': return 'SURIGAO-DEL-SUR'; break;
        case 'PH-TAR': return 'TARLAC'; break;
        case 'PH-TAW': return 'TAWI-TAWI'; break;
        case 'PH-ZMB': return 'ZAMBALES'; break;
        case 'PH-ZAN': return 'ZAMBOANGA-DEL-NORTE'; break;
        case 'PH-ZAS': return 'ZAMBOANGA-DEL-SUR'; break;
        case 'PH-ZSI': return 'ZAMBOANGA-SIBUGAY'; break;
        default: return '';
    }
}

function initializeAddress() {
    $.ajax({
        type: "GET",  
        url: "address.csv",
        dataType: "text",       
        success: response => {
            let arr = $.csv.toArrays(response);
            let temp = [];

            for (var i = 0; i < arr.length; i++) {
                if (arr[i] == null) {
                    break;
                }

                let rows = 0;
                let obj = {
                    province: arr[i][0],
                    cities: [],
                }

                let cityRows = 0;
                for (var j = 0; j < arr.length; j++) {
                    if (arr[i + j] == null) {
                        break;
                    } else if (arr[i + j][0] == arr[i][0]) {
                        cityRows++;
                        let city = {
                            city: arr[i + j][1],
                            barangays: [],
                        }

                        let barangayRows = 0;
                        for (var k = 0; k < arr.length; k++) {
                            if (arr[i + j + k] == null) {
                                break;
                            } else if (arr[i + j + k][1] == arr[i + j][1]) {
                                rows++;
                                barangayRows++;
                                city.barangays.push(arr[i + j + k][2]);                           
                            } else {
                                break;
                            }
                        }

                        obj.cities.push(city);
                        j += barangayRows - 1;
                    } else {
                        break;
                    }
                }

                temp.push(obj);
                i += rows - 1;
            }

            address = temp;
        }   
    });
}