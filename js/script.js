"use strict";

let rows = 0;

document.addEventListener('DOMContentLoaded', () => {
    createSelectChoiseSubdivision();
});

//прием данных штата и заполнение строки "по штату"
function receiveState(url) {
    //Fetch
    let response = fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    response.then(responce => responce.json())
        .then(data => {
            //заполнение строки со штатом
            let cells = rows[0].cells,
                [traders, technicians, helpers, managers, sum] = [0, 0, 0, 0, 0];

            for (let i = 0; i < data['stateSubdivision'].length; i++) {
                traders += data['stateSubdivision'][i]['state']['traders'];
                technicians += data['stateSubdivision'][i]['state']['technicians'];
                helpers += data['stateSubdivision'][i]['state']['helpers'];
                managers += data['stateSubdivision'][i]['state']['managers'];
                sum = traders + technicians + helpers + managers;
            }
            cells[1].innerHTML = traders;
            cells[2].innerHTML = technicians;
            cells[3].innerHTML = helpers;
            cells[4].innerHTML = managers;
            cells[5].innerHTML = sum;
        });


    //XMLHttpRequest
    /*let miniAJAX = new XMLHttpRequest(),
        answer = null;
    miniAJAX.open("POST", `php/functions.php`, true);
    miniAJAX.send(JSON.stringify(personnelAll));

    miniAJAX.onreadystatechange = function () {
        if (miniAJAX.readyState === 4) {
            if (miniAJAX.status !== 200) {
                throw {
                    type: "JSON Error",
                    message: "Can`t receive data from server"
                };
            } else {
                try {
                    answer = miniAJAX.responseText;
                    console.log(answer);
                } catch (error) {
                    console.log(error);
                }
            }
        }
    };*/
}

//создание таблиц с отсутствующими "tableAbsense" и причинами отсутствия "tableCauses"
//прием данных с сервера из файла data.json (список л/с), заполнение строк "по списку" и "в наличии"
//навешивание события "нажатия на клавишу" (для принятия изменений в таблице "tableAbsense") и перехода к другой ячейке ("фокус") и события "клика" (для удаления отсутствующего из таблицы "tableAbsense" и изменения значений в таблицах "tablePersonnel" и "tableCauses")
function fillTable(flag = false) {
    createTables();
    if (document.querySelector('table[name="tableAbsense"]')) {
        let response = fetch('php/data.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        });
        response.then(data => data.json())
            .then(data => insertDateTime(data, flag))
            .then(data => parseString(data['persons']))
            .then(data => addOption(data))
            .then(data => nullify(data, 1, 'table[name="tablePersonnel"]'))
            .then(data => nullify(data, 2, 'table[name="tablePersonnel"]'))
            .then(data => nullify(data, 3, 'table[name="tablePersonnel"]'))
            .then(data => nullify(data, 0, 'table[name="tableCauses"]', true))
            .then(data => fillRow(data, 1))
            .then(data => fillRow(data, 2))
            .then(data => {
                Array.from(document.querySelector('table[name="tableAbsense"]').tBodies[0].children).forEach(tr => tr.remove());
                addTrTableAbsense(data);
                if (flag) {
                    hidden(document.querySelectorAll("input[name='delRow']"));
                    insertRowInspektor(data);
                    checkTableAbsense(data);
                }
                return data;
            })
            .catch(error => console.log(error));
    }
}

//создание таблицы "отсутствующие" ("tableAbsense") и <select> для их добавления в таблицу
function createTableAbsense() {
    document.body.insertAdjacentHTML('beforeend', `
        <table name='tableAbsense'>
            <thead>
                <tr>
                    <th>№<br/>п/п</th>
                    <th>Принадлежность</th>
                    <th>Фамилия, инициалы</th>
                    <th>Причина отсутствия,<br/>где находится</th>
                    <th>Основание<br/>(приказ)</th>
                    <th>Дата выхода<br/>на работу</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>`);
    let tableAbsense = document.querySelector('table[name="tableAbsense"]');
    tableAbsense.addEventListener('keypress', (e) => {
        if ((e.key === 'Enter' || e.key === 'Tab') && e.target.tagName.toLowerCase() === 'input') {
            let currentInput = e.target,
                parent = currentInput.parentElement;
            currentInput.blur();
            currentInput.insertAdjacentHTML('beforebegin', `${currentInput.value ? currentInput.previousElementSibling ? ', ' + currentInput.value : currentInput.value : ''}`);
            currentInput.remove();
            if (parent.nextElementSibling) {
                parent.nextElementSibling.querySelector('input').focus();
            }
        }
    });
    tableAbsense.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'input' && e.target.name === 'delRow') {
            let input = tableAbsense.querySelector(`input[data-row='${e.target.dataset["row"]}']`),
                cause = input.parentElement.innerHTML.match(/[а-я]+/)[0] || "другиепричины",
                option = document.querySelector(`select option[data-index='${input.parentElement.parentElement.dataset["row"]}']`),
                group = option.value.match(/[а-я]+/gi)[1];

            input.parentElement.parentElement.remove();
            option.classList.toggle("optionHidden");

            decrementGroupTableAbsense(group);
            incrementGroupTableAbsense(group);
            decrementTableCauses(cause);

            [...tableAbsense.tBodies[0].rows].forEach((row, i) => {
                row.children[0].innerHTML = i + 1;
                let inp = row.children[3].querySelector('input[name="delRow"]');
                inp.dataset['row'] = i + 1;
                inp.title = `delete row № ${i + 1}`;
            });
        }
    });
}

function createSelectAbsense() {
    document.querySelector('table[name="tableAbsense"]').insertAdjacentHTML('beforebegin', `
    <select name="addAbsense"><option></option></select>`);
}

//добавление строк в таблицу "отсутствующие" ("tableAbsense")
function addTr(params) {
    let selectedValue = this.options[this.selectedIndex].value.split('|').map(el => el.trim()),
        [otdel, group, zvanie, name] = selectedValue,
        table = document.querySelector('table[name="tableAbsense"]')

    //добавление <tr> c данными в <tbody>
    table.tBodies[0].insertAdjacentHTML('beforeend', `
        <tr data-row="${this.options[this.selectedIndex].dataset['index']}">
            <td>${table.tBodies[0].children.length + 1}</td>
            <td>${zvanie || ''}</td>
            <td>${name || ''}</td>
            <td>
                <select name="choiseCause">
                    <option value="хз"></option>
                    <option value="больница">больница</option>
                    <option value="болен">болен</option>
                    <option value="командировка">командировка</option>
                    <option value="отпуск">отпуск</option>
                    <option value="другие">социальный отпуск</option>
                    <option value="отпускпо">отпуск по уходу за ребенком</option>
                    <option value="дежурство">дежурство</option>
                    <option value="другие">после дежурства</option>
                    <option value="другие">другие причины</option>
                </select>
            </td>
            <td><input type="text" name="enterData" class="inputCenter"></td>
            <td><input type="text" name="enterData" class="inputCenter"></td>
        </tr>`);

    incrementTableAbsense(group);
    decrementTableAbsense(group);

    this.options[this.selectedIndex].classList.toggle('optionHidden');

    [...document.querySelectorAll('select[name="choiseCause"]')].forEach(element => {
        element.addEventListener('change', fillTableCauses);
    });
}

//добавление людей (<option>) в <select> ("addAbsense") для их последующего добавления в таблицу "tableAbsense"
function addOption(params) {
    let select = document.querySelector('select[name="addAbsense"]'),
        cloneParams = [].concat(params),
        tmp = '';

    //создание <option>'s из переданных параметров
    cloneParams.forEach((value, index) => {
        tmp += `<option data-index="${index}">${value[0]} | ${value[1]} | ${value[2]} | ${value[3]}</option>`;
    });

    select.insertAdjacentHTML('beforeend', tmp);
    select.addEventListener('change', addTr);

    return params;
}

//распаршивание (разбиение) строк на массивы
function parseString(array) {
    return array.map(el => el.split('|').map(subEl => subEl.trim()));
}

//заполнение строки, номер которой передан 2-ым параметром
//по номерам (для справки): 0 - строка "по штату", 1 - строка "по списку", 2 - строка "в наличии", 3 - строка "отсутствующие"
function fillRow(params, numberRow) {
    let [, traders, technicians, helpers, managers, sum] = rows[numberRow].children,
        cloneParams = [].concat(params);

    params.forEach(el => {
        switch (el[1]) {
            case 'торговец':
                traders.innerHTML = +traders.innerHTML + 1;
                break;
            case 'управленец':
                managers.innerHTML = +managers.innerHTML + 1;
                break;
            case 'помощник':
                technicians.innerHTML = +technicians.innerHTML + 1;
                break;
            case 'техник':
                helpers.innerHTML = +helpers.innerHTML + 1;
                break;
        }
    });
    sum.innerHTML = params.length;

    // if (!+traders.innerHTML) traders.innerHTML = '0';
    // if (!+managers.innerHTML) managers.innerHTML = '0';
    // if (!+technicians.innerHTML) technicians.innerHTML = '0';
    // if (!+helpers.innerHTML) helpers.innerHTML = '0';

    return cloneParams;
}

//создание таблицы с причинами отсутствия
function createTableCauses(params) {
    document.querySelector('table[name="tablePersonnel"]').insertAdjacentHTML('afterend', `
        <table name='tableCauses'>
            <thead>
                <tr>
                    <th>больница</th>
                    <th>освобожден по болезни</th>
                    <th>командировка</th>
                    <th>отпуск</th>
                    <th>дежурство</th>
                    <th>другие причины</th>
                    <th>Всего</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            </tbody>
        </table>`);
}

//заполнение таблицы с причинами отсутствия
function fillTableCauses() {
    let selectedValue = this.options[this.selectedIndex];
    incrementTableCauses(selectedValue.value);
    //вставка <input> после <select> для ввода местонахождения
    if (!this.parentElement.querySelector(`input[name="enterPlace"]`)) {
        this.insertAdjacentHTML('afterend', `<input type="text" name="enterPlace" class="inputCenter inputActive" placeholder="enter the location">`);
        this.nextElementSibling.focus();
        this.insertAdjacentHTML('beforebegin', `<input type="button" name="delRow" class="deleteRow" value="x" data-row=${this.parentElement.previousElementSibling.previousElementSibling.previousElementSibling.innerHTML} title="delete row № ${this.parentElement.previousElementSibling.previousElementSibling.previousElementSibling.innerHTML}">`);
    }
    this.insertAdjacentHTML('beforebegin', `${selectedValue.innerHTML}`);
    this.remove();
}

//добавление 1 в таблицу "tableCauses"
function incrementTableCauses(param) {
    let [hospital, sick, trip, vacation, duty, another, sum] = document.querySelector('table[name="tableCauses"] tbody tr').children;
    switch (param) {
        case 'больница':
            hospital.innerHTML = (+hospital.innerHTML) + 1;
            break;
        case 'болен':
            sick.innerHTML = (+sick.innerHTML) + 1;
            break;
        case 'командировка':
            trip.innerHTML = (+trip.innerHTML) + 1;
            break;
        case 'отпуск':
            vacation.innerHTML = (+vacation.innerHTML) + 1;
            break;
        case 'дежурство':
            duty.innerHTML = (+duty.innerHTML) + 1;
            break;
        case 'другие причины':
            another.innerHTML = (+another.innerHTML) + 1;
            break;
        case 'после дежурства':
            another.innerHTML = (+another.innerHTML) + 1;
            break;
        case 'социальный отпуск':
            another.innerHTML = (+another.innerHTML) + 1;
            break;
        case 'отпуск по уходу за ребенком':
            another.innerHTML = (+another.innerHTML) + 1;
            break;
    }
    sum.innerHTML = (+hospital.innerHTML) + (+sick.innerHTML) + (+trip.innerHTML) + (+vacation.innerHTML) + (+duty.innerHTML) + (+another.innerHTML);
}

//убавление 1 в таблице "tableCauses"
function decrementTableCauses(param) {
    let [hospital, sick, trip, vacation, duty, another, sum] = document.querySelector('table[name="tableCauses"] tbody tr').children;
    switch (param) {
        case 'больница':
            hospital.innerHTML = (+hospital.innerHTML) - 1;
            break;
        case 'болен':
            sick.innerHTML = (+sick.innerHTML) - 1;
            break;
        case 'командировка':
            trip.innerHTML = (+trip.innerHTML) - 1;
            break;
        case 'отпуск':
            vacation.innerHTML = (+vacation.innerHTML) - 1;
            break;
        case 'дежурство':
            duty.innerHTML = (+duty.innerHTML) - 1;
            break;
        case 'другие причины':
            another.innerHTML = (+another.innerHTML) - 1;
            break;
        case 'после дежурства':
            another.innerHTML = (+another.innerHTML) - 1;
            break;
        case 'социальный отпуск':
            another.innerHTML = (+another.innerHTML) - 1;
            break;
        case 'отпуск по уходу за ребенком':
            another.innerHTML = (+another.innerHTML) - 1;
            break;
    }
    sum.innerHTML = (+hospital.innerHTML) + (+sick.innerHTML) + (+trip.innerHTML) + (+vacation.innerHTML) + (+duty.innerHTML) + (+another.innerHTML);
}

//убавление 1 в таблице "tablePersonnel" взависимости от принадлежности к группе в строке "в наличии"
function decrementTableAbsense(params) {
    let [, tradersFaceTd, techniciansFaceTd, helpersFaceTd, managersFaceTd, sumFaceTd] = rows[2].children;
    switch (params) {
        case 'торговец':
            tradersFaceTd.innerHTML = +tradersFaceTd.innerHTML - 1;
            break;
        case 'управленец':
            managersFaceTd.innerHTML = +managersFaceTd.innerHTML - 1;
            break;
        case 'помощник':
            techniciansFaceTd.innerHTML = +techniciansFaceTd.innerHTML - 1;
            break;
        case 'техник':
            helpersFaceTd.innerHTML = +helpersFaceTd.innerHTML - 1;
            break;
    };
    //перерасчет суммы в строке "в наличии"
    sumFaceTd.innerHTML = (+tradersFaceTd.innerHTML) + (+techniciansFaceTd.innerHTML) + (+helpersFaceTd.innerHTML) + (+managersFaceTd.innerHTML);
}

//добавление 1 в таблице "tablePersonnel" взависимости от принадлежности к группе в строке "отсутствующие"
function incrementTableAbsense(params) {
    let [, tradersAbsenseTd, techniciansAbsenseTd, helpersAbsenseTd, managersAbsenseTd, sumAbsenseTd] = rows[3].children,
        table = document.querySelector('table[name="tableAbsense"]');
    switch (params) {
        case 'торговец':
            tradersAbsenseTd.innerHTML = +tradersAbsenseTd.innerHTML + 1;
            break;
        case 'управленец':
            managersAbsenseTd.innerHTML = +managersAbsenseTd.innerHTML + 1;
            break;
        case 'помощник':
            techniciansAbsenseTd.innerHTML = +techniciansAbsenseTd.innerHTML + 1;
            break;
        case 'техник':
            helpersAbsenseTd.innerHTML = +helpersAbsenseTd.innerHTML + 1;
            break;
    };
    //перерасчет суммы в строке "отсутствуeт"
    sumAbsenseTd.innerHTML = (+tradersAbsenseTd.innerHTML) + (+techniciansAbsenseTd.innerHTML) + (+helpersAbsenseTd.innerHTML) + (+managersAbsenseTd.innerHTML);
    //подсчет кол-ва отсутствующих
    sumAbsenseTd.innerHTML = table.tBodies[0].children.length;
}

//прибавление 1 в таблице "tablePersonnel" в строке "в наличии" при удалении строки (человека) из таблицы "tableAbsense"
function incrementGroupTableAbsense(group) {
    let [, tradersFaceTd, techniciansFaceTd, helpersFaceTd, managersFaceTd, sumFaceTd] = rows[2].children;
    switch (group) {
        case 'торговец':
            tradersFaceTd.innerHTML = +tradersFaceTd.innerHTML + 1;
            break;
        case 'управленец':
            managersFaceTd.innerHTML = +managersFaceTd.innerHTML + 1;
            break;
        case 'помощник':
            techniciansFaceTd.innerHTML = +techniciansFaceTd.innerHTML + 1;
            break;
        case 'техник':
            helpersFaceTd.innerHTML = +helpersFaceTd.innerHTML + 1;
            break;
    };
    //перерасчет суммы в строке "в наличии"
    sumFaceTd.innerHTML = (+tradersFaceTd.innerHTML) + (+techniciansFaceTd.innerHTML) + (+helpersFaceTd.innerHTML) + (+managersFaceTd.innerHTML);
}

//убавление 1 в таблице "tablePersonnel" в строке "отсутствует" при удалении строки (челоdека) из таблицы "tableAbsense"
function decrementGroupTableAbsense(group) {
    let [, tradersAbsenseTd, techniciansAbsenseTd, helpersAbsenseTd, managersAbsenseTd, sumAbsenseTd] = rows[3].children,
        table = document.querySelector('table[name="tableAbsense"]');
    switch (group) {
        case 'торговец':
            tradersAbsenseTd.innerHTML = +tradersAbsenseTd.innerHTML - 1;
            break;
        case 'управленец':
            managersAbsenseTd.innerHTML = +managersAbsenseTd.innerHTML - 1;
            break;
        case 'помощник':
            techniciansAbsenseTd.innerHTML = +techniciansAbsenseTd.innerHTML - 1;
            break;
        case 'техник':
            helpersAbsenseTd.innerHTML = +helpersAbsenseTd.innerHTML - 1;
            break;
    };
    //перерасчет суммы в строке "отсутствуeт"
    sumAbsenseTd.innerHTML = (+tradersAbsenseTd.innerHTML) + (+techniciansAbsenseTd.innerHTML) + (+helpersAbsenseTd.innerHTML) + (+managersAbsenseTd.innerHTML);
    //подсчет кол-ва отсутствующих
    sumAbsenseTd.innerHTML = table.tBodies[0].children.length;
}

//для оправки данных на сервер для формирования таблицы
function parsing(data) {
    try {
        let rowsTableAbsense = [...document.querySelector('table[name="tableAbsense"]').tBodies[0].rows];
        if (rowsTableAbsense.length) {
            let tmp = rowsTableAbsense.map(item => {
                let [, , fullName, causeAndLoc, prikaz, dateOut] = item.children;
                causeAndLoc = causeAndLoc.innerHTML.match(/>[а-яa-z0-9,. ]+/gi)[0].slice(1);
                return [fullName.innerHTML, causeAndLoc, prikaz.innerText, dateOut.innerText];
            });
            return parseString(data).map(item => {
                tmp.forEach(() => {
                    [item[4], item[5], item[6]] = "";
                });
                tmp.forEach(el => {
                    if (item[3] === el[0]) {
                        [item[4], item[5], item[6]] = [el[1], el[2], el[3]];
                    }
                });
                return item.join("|");
            });
        } else {
            return parseString(data).map(item => {
                [item[4], item[5], item[6]] = "";
                return item.join("|");
            });
        }
    } catch (error) {
        console.log(error);
    }
}

//для оправки данных на сервер для формирования таблицы
function sentToServer(data) {
    fetch('php/functions.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({
            'persons': data,
            'datetime': parsingDateTime()
        })
    });
    return data;
}

//для оправки данных на сервер для формирования таблицы
function sendData() {
    let response = fetch('php/data.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    response.then(data => data.json())
        .then(data => parsing(data['persons']))
        .then(data => sentToServer(data))
        .catch(data => console.log(data));


    //XMLHttpRequest
    /*let miniAJAX = new XMLHttpRequest(),
        answer = null;
    miniAJAX.open("POST", `php/functions.php`, true);
    miniAJAX.send(JSON.stringify(personnelAll));

    miniAJAX.onreadystatechange = function () {
        if (miniAJAX.readyState === 4) {
            if (miniAJAX.status !== 200) {
                throw {
                    type: "JSON Error",
                    message: "Can`t receive data from server"
                };
            } else {
                try {
                    answer = miniAJAX.responseText;
                    console.log(answer);
                } catch (error) {
                    console.log(error);
                }
            }
        }
    };
    } else {
            console.log('rows is not defined');
    }*/
}

//добавление отсутствующих в таблицу "tableAbsense" после получения данных с сервера при загрузки страницы
function addTrTableAbsense(params) {
    let bodyTableAbsense = document.querySelector('table[name="tableAbsense"]').tBodies[0],
        selectAddAbsense = document.querySelector('select[name="addAbsense"]'),
        cloneParams = [].concat(params);

    cloneParams.forEach(item => {
        if (item[4] || item[5] || item[6]) {
            //добавление <tr> c данными в <tbody>
            bodyTableAbsense.insertAdjacentHTML('beforeend', `
                <tr data-row="${findOption(item[0], item[1], item[2], item[3])}">
                    <td>${bodyTableAbsense.children.length + 1}</td>
                    <td>${item[2]}</td>
                    <td>${item[3]}</td>
                    <td>
                        <input type="button" name="delRow" class="deleteRow" value="x" data-row=${bodyTableAbsense.children.length + 1} title="delete row № ${bodyTableAbsense.children.length + 1}">${item[4]}
                    </td>
                    <td>${item[5]}</td>
                    <td>${item[6]}</td>
                </tr>`);

            decrementTableAbsense(item[1]);
            incrementTableAbsense(item[1]);

            let tmp = item[4].match(/[а-я ]+(,)*/gi);
            if (item[4].match(/[а-я]+/gi)) tmp = item[4].match(/[а-я ]+(,)*/gi)[0];
            if (tmp[tmp.length - 1] === ',') tmp = tmp.slice(0, -1);
            incrementTableCauses(tmp);

            selectAddAbsense.querySelector(`option[data-index="${findOption(item[0], item[1], item[2], item[3])}"]`).classList.toggle('optionHidden');
        }
    });

    return params;

    //поиск <option> в <select name="addAbsense">
    function findOption() {
        let tmp = [].concat(...arguments).join(" | "),
            number = null;
        [...selectAddAbsense.children].forEach(elem => {
            if (elem.innerHTML === tmp) {
                number = elem.dataset['index'];
            }
        });
        return number;
    };
}

//присваивание класса "optionHidden" для скрытия массива элементов
function hidden(arrayElements) {
    arrayElements.forEach(elem => {
        if (elem.length > 1) {
            Array.from(elem).forEach(el => el.classList.toggle('optionHidden'));
        } else {
            elem.classList.toggle('optionHidden');
        }
    });
}

//создание формы с элементами для ввода логина и пароля
function createAuthForm() {
    let personnel = document.querySelector('table[name="tablePersonnel"]'),
        causes = document.querySelector('table[name="tableCauses"]'),
        title = document.querySelector('div[name="titlePage"]'),
        absense = document.querySelector('table[name="tableAbsense"]'),
        select = document.querySelector('select[name="addAbsense"]');
    if (personnel) {
        title.remove();
        personnel.remove();
        causes.remove();
        absense.remove();
        select.remove();
        if (document.querySelector('div.rowInspektor')) document.querySelector('div.rowInspektor').remove();
    }
    let form = document.createElement('form'),
        inpLogin = document.createElement('input'),
        inpPassw = document.createElement('input'),
        inpSend = document.createElement('input');
    //создание элементов для ввода логина и пароля, добавление их на страницу
    inpLogin.type = 'text';
    inpPassw.type = 'password';
    inpLogin.placeholder = 'enter your login';
    inpPassw.placeholder = 'enter your password';
    inpSend.type = 'submit';
    inpSend.value = 'send data';
    inpLogin.style.display = inpPassw.style.display = inpSend.style.display = 'block';
    inpLogin.style.width = inpPassw.style.width = inpSend.style.width = '100%';
    inpLogin.style.textAlign = inpPassw.style.textAlign = inpSend.style.textAlign = 'center';
    form.style.width = '30%';
    form.style.margin = '20% auto 0';
    form.name = 'authForm';
    inpLogin.name = 'username';
    inpPassw.name = 'password';
    form.append(inpLogin, inpPassw, inpSend);
    document.body.append(form);
    form.addEventListener('submit', function (e) {
        checkAuth(e);
    });
}

//проверка логина и пароля
function checkAuth(e) {
    e.preventDefault();
    let form = e.target,
        username = form["username"].value,
        password = form["password"].value,
        flag = 0;
    fetch('php/auth.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
        .then(json => json.json())
        .then(data => {
            flag = (+(username === data['login']) * +(password === data['password']));
            return flag;
        })
        .then(data => {
            if (data) {
                form.remove();
                receiveState('php/state.json');
                fillTable();
                createInputSendData();
                document.querySelector("input[name='sendData']").addEventListener('click', sendData);
            } else {
                alert('Проверьте вводимые дынные.\nЛогин или пароль не верны');
            }
        });
}

//создание <select> для выбора подразделения
function createSelectChoiseSubdivision() {
    let response = fetch('php/state.json', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });
    document.body.insertAdjacentHTML('afterbegin', `
    <ul name="selectChoiseSubdivision" class="choiseSubdivision">
        <li>инспектор по кадрам</li>
        <li>весь филиал</li>
        <li>по отделам</li>
    </ul>`);
    response.then(json => json.json())
        .then(data => data['stateSubdivision'].forEach(subdiv => {
            document.body.querySelector('ul[name="selectChoiseSubdivision"]').insertAdjacentHTML('beforeend', `<li>${subdiv['subdivision']}</li>`);
        }));
    document.querySelector('ul[name="selectChoiseSubdivision"]').addEventListener('click', e => {
        choiseSubdivision(e.target);
    });
}

//создание заголовка страницы
function createTitlePage() {
    document.body.insertAdjacentHTML('beforeend', `
        <div name="titlePage">
            <h1>НАЛИЧИЕ</h1>
            <h2>персонала <span></span><br/>филиала № 8<br/>ОАО "Универсам" на <input type="date"><span></span></h2>
            <h2>(по состоянию на <input type="time"><span></span>)</h2>
        </div>`);
}

//создание таблицы таблицы
function createTablePersonnel() {
    document.body.insertAdjacentHTML('beforeend', `
        <table name="tablePersonnel">
            <thead>
                <tr>
                    <th rowspan="2">Вид учета</th>
                    <th colspan="6">Персонал</th>
                </tr>
                <tr>
                    <th>Тоговцы</th>
                    <th>Помощники</th>
                    <th>Техники</th>
                    <th>Управленцы</th>
                    <th>Всего</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th>По штату</th>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <th>По списку</th>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <th>В наличии</th>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <th>Отсутствует</th>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            </tbody>
        </table>`);
}

function createInputSendData() {
    document.body.insertAdjacentHTML('beforeend', `
        <input type="button" value="отправить таблицы" name="sendData"></input>`);
}

//вызов соответствующей функции, зависит от выбранного подразделения. Переключение пунктов меню
function choiseSubdivision(param) {
    switch (param.innerHTML) {
        case 'инспектор по кадрам':
            checkTables();
            checkTableAboutSubdivision();
            createAuthForm();
            break;
        case 'весь филиал':
            checkTables();
            checkTableAboutSubdivision();
            createTables();
            receiveState('php/state.json');
            fillTable(true);
            document.querySelector('select[name="addAbsense"]').className = "optionHidden";
            insertNameSubdivision('');
            break;
        case 'по отделам':
            checkTables();
            checkTableAboutSubdivision();
            createTitlePage();
            createTableAboutSubdivision();
            insertNameSubdivision(param.innerHTML);
            fillStateTableAboutSubdivision();
            fillTableAboutSubdivision();
            break;
        default:
            checkTables();
            checkTableAboutSubdivision();
            createTables();
            findSubdivision(param.innerHTML);
            fillTable();
            insertNameSubdivision(param.innerHTML);
            if (document.querySelector('div.rowInspektor')) document.querySelector('div.rowInspektor').remove();
            break;
    }
}

//поиск подразделения
function findSubdivision(param) {
    fetch('php/state.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
        .then(json => json.json())
        .then(data => fillState(data, param))
        .then(data => selectPeople(data))
}

//заполнение строки со штатом при выборе отдела, возвращает название подразделения
function fillState(data, subdiv) {
    let arr = [].concat(data["stateSubdivision"]).find(item => item['subdivision'] === subdiv),
        cells = rows[0].cells,
        i = 1,
        sum = 0;
    for (const iterator in arr['state']) {
        cells[i].innerHTML = arr['state'][iterator];
        sum += arr['state'][iterator];
        i++;
    }
    cells[i].innerHTML = sum;
    return subdiv;
}

//выборка подразделения из всего списка л/с
function selectPeople(nameSubdiv) {
    fetch('php/data.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
        .then(json => json.json())
        .then(data => insertDateTime(data, true))
        .then(data => parseString(data['persons']).filter(item => item[0] === nameSubdiv))
        .then(data => nullify(data, 1, 'table[name="tablePersonnel"]'))
        .then(data => nullify(data, 2, 'table[name="tablePersonnel"]'))
        .then(data => nullify(data, 3, 'table[name="tablePersonnel"]'))
        .then(data => nullify(data, 0, 'table[name="tableCauses"]', true))
        .then(data => fillRow(data, 1))
        .then(data => fillRow(data, 2))
        .then(data => {
            Array.from(document.querySelector('table[name="tableAbsense"]').tBodies[0].children).forEach(tr => tr.remove());
            addTrTableAbsense(data);
            hidden(document.querySelectorAll("input[name='delRow']"));
            document.querySelector("select").className = "optionHidden";
            checkTableAbsense(data);
        })
        .catch(error => console.log(error));
}

//обнуление выбранной строки в выбранной таблице
function nullify(data, numberRow, selectorTable, flag = false) {
    if (flag) {
        Array.from(document.querySelector(selectorTable).tBodies[0].rows[numberRow].children).forEach(el => el.innerHTML = '0');
    } else {
        let [, traders, technicians, helpers, managers, sum] = document.querySelector(selectorTable).tBodies[0].rows[numberRow].children;
        traders.innerHTML = '0';
        managers.innerHTML = '0';
        technicians.innerHTML = '0';
        helpers.innerHTML = '0';
        sum.innerHTML = '0';
    }
    return data;
}

function createTables() {
    if (document.querySelector('form[name="authForm"]')) {
        document.querySelector('form[name="authForm"]').remove();
    }
    if (!document.querySelector('table[name="tableAbsense"]')) {
        createTitlePage();
        createTablePersonnel();
        createTableAbsense();
        createSelectAbsense();
        createTableCauses();
        rows = document.querySelector('table[name="tablePersonnel"] tbody').rows;
    }
    if (document.querySelector('input[name="sendData"]')) {
        document.querySelector('input[name="sendData"]').remove();
    }
}

//вставка названия подразделения при выборе из верхнего меню
function insertNameSubdivision(param) {
    document.querySelector('h2 span').innerHTML = `${param == 'начальство' ? param.replace(/е/, "я") : param == "группа" ? param.replace(/а/, "ы") : param == 'по отделам' ? "(" + param + ")" : param == '' ? '' : param + 'a'}`;
}

//парсинг даты и времени
function parsingDateTime() {
    let date = document.querySelector('input[type="date"]'),
        time = document.querySelector('input[type="time"]');
    let datetime = Date.parse(date.value + "T" + time.value) || Date.now();
    return datetime;
}

//вставка даты и времени из файла таблицы с сервера
function insertDateTime(params, flag = false) {
    if (flag) {
        let datetime = new Date(params['datetime']),
            date = document.querySelector('input[type="date"]'),
            time = document.querySelector('input[type="time"]');
        date.className = time.className = 'optionHidden';
        date.nextElementSibling.innerHTML = `${addZero(datetime.getDate())}.${addZero(datetime.getMonth() + 1)}.${datetime.getFullYear()}`;
        time.nextElementSibling.innerHTML = `${addZero(datetime.getHours())}.${addZero(datetime.getMinutes())}`;
    }
    return params;
}

//добавление нуля
function addZero(params) {
    return +params < 10 ? `0${params}` : params;
}

//добавление строки под подпись инспектора по кадрам
function insertRowInspektor(params) {
    if (!document.querySelector('div.rowInspektor')) {
        document.body.insertAdjacentHTML('beforeend', "<div class='rowInspektor' contenteditable><div><div>Инспектор по кадрам</div><div>Н.Н.Иванова</div></div></div>");
    }
    return params;
}

//проверка таблицы "tableAbsense" на пустоту
function checkTableAbsense(params) {
    let table = document.querySelector('table[name="tableAbsense"]');
    if (!table.tBodies[0].children.length) {
        table.className = 'optionHidden';
    } else {
        table.className = '';
    }
    return params;
}

//проверка таблицы "AboutSubdivision" на наличие
function checkTableAboutSubdivision(params) {
    if (document.querySelector(`table[name="tableAboutSubdivision"]`)) {
        document.querySelector(`table[name="tableAboutSubdivision"]`).remove();
    }
    if (document.querySelector(`div[name="titlePage"]`)) {
        document.querySelector(`div[name="titlePage"]`).remove();
    }
}

//создание таблицы "AboutSubdivision" с таблицыом по отделам
function createTableAboutSubdivision() {
    let response = fetch('php/state.json', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });
    response.then(json => json.json())
        .then(data => {
            let elem = document.querySelector("table[name='tableAboutSubdivision']");
            if (elem) {
                elem.remove();
            }
            let count = data['stateSubdivision'].length;
            document.body.insertAdjacentHTML('beforeend', `
            <table name="tableAboutSubdivision">
                <thead>
                    <tr>
                        <th rowspan="2">Вид учета</th>
                        <th colspan="${count}">Персонал</th>
                        <th rowspan="2">Итого</th>
                    </tr>
                    <tr></tr>
                </thead>
                <tbody></tbody>
            </table>`);
            return data;
        })
        .then(data => {
            data['stateSubdivision'].forEach(subdiv => {
                //заполненение thead таблицы tableAboutSubdivision
                document.body.querySelector('table[name="tableAboutSubdivision"] thead').children[1].insertAdjacentHTML('beforeend', `<th>${subdiv['subdivision'].replace(/\s/, "<br/>")}</th>`);
            });
            return data;
        })
        .then(data => {
            //заполненение tbody таблицы tableAboutSubdivision
            let cases = ["По штату", "По списку", "В наличии", "Отсутствует", "больница", "заболевание", "командировка", "отпуск", "дежурство", "другие<br/>причины"],
                count = cases.length;
            for (let i = 0; i < count; i++) {
                let tr = document.createElement("tr");
                tr.insertAdjacentHTML('beforeend', `<td>${cases[i]}</td>`);
                data['stateSubdivision'].forEach(() => {
                    tr.insertAdjacentHTML('beforeend', `<td></td>`);
                });
                tr.insertAdjacentHTML('beforeend', `<td></td>`);
                document.body.querySelector('table[name="tableAboutSubdivision"] tbody').insertAdjacentElement('beforeend', tr);
            }
        });
    document.querySelector('ul[name="selectChoiseSubdivision"]').addEventListener('click', e => {
        choiseSubdivision(e.target);
    });
}

//заполнение штата таблицы "AboutSubdivision"
function fillStateTableAboutSubdivision() {
    let response = fetch('php/state.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });
    response.then(json => json.json())
        .then(data => {
            let tbody = document.querySelector('table[name="tableAboutSubdivision"] tbody');
            for (let i = 0; i < data['stateSubdivision'].length; i++) {
                let sum = 0;
                for (const key in data['stateSubdivision'][i]['state']) {
                    const element = data['stateSubdivision'][i]['state'][key];
                    sum += element;
                }
                tbody.rows[0].children[i + 1].innerHTML = sum;
            }
        });
}

//заполнение таблицы "AboutSubdivision"
function fillTableAboutSubdivision() {
    let response = fetch('php/data.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });
    response.then(json => json.json())
        .then(data => {
            let tbody = document.querySelector('table[name="tableAboutSubdivision"] tbody'),
                subdivisions = [...new Set([].concat(data['persons']).map(pers => pers.split('|').shift()))],
                persons = parseString(data['persons']),
                tmpArr = [];

            for (let y = 1, x = 0, l = tbody.rows[1].children.length - 1; y < l; y++) {
                for (let i = 1; i < tbody.rows.length; i++) {
                    tmpArr.push(tbody.rows[i].children[y]);
                }
                tmpCalc(persons, subdivisions[x], tmpArr);
                tmpArr.splice(0, tmpArr.length);
                x++;
            }

            function tmpCalc(array, param, tmpArray) {
                let tmp = [].concat(array).filter(data => data[0] === param);
                for (let i = 0; i < tmp.length; i++) {
                    const element = tmp[i];
                    tmpArray[0].innerHTML = +tmpArray[0].innerHTML + 1;
                    fillFaceAbsense(element[4], tmpArray[1], tmpArray[2]);
                    fillCauses(element[4], tmpArray[3], tmpArray[4], tmpArray[5], tmpArray[6], tmpArray[7], tmpArray[8]);
                }
            }

            insertDateTime(data, true);
            calcSum(tbody);
            return data;
        })
        .then(data => {
            if (document.querySelector('table[name="tableAbsense"]')) {
                document.querySelector('table[name="tableAbsense"]').remove();
            }
            createTableAbsense();
            let bodyTableAbsense = document.querySelector('table[name="tableAbsense"]').tBodies[0],
                cloneParams = [].concat(parseString(data['persons']));

            cloneParams.forEach(item => {
                if (item[4] || item[5] || item[6]) {
                    //добавление <tr> c данными в <tbody>
                    bodyTableAbsense.insertAdjacentHTML('beforeend', `
                        <tr>
                            <td>${bodyTableAbsense.children.length + 1}</td>
                            <td>${item[2]}</td>
                            <td>${item[3]}</td>
                            <td>${item[4]}</td>
                            <td>${item[5]}</td>
                            <td>${item[6]}</td>
                        </tr>`);
                }
            });
            checkTableAbsense(data);
            return data;
        });
}

//заполнение "в наличии" и "отсутствует" таблицы "AboutSubdivision"
function fillFaceAbsense(param, elOne, elTwo) {
    if (param) {
        elTwo.innerHTML = +elTwo.innerHTML + 1;
    } else {
        elOne.innerHTML = +elOne.innerHTML + 1;
    }
}

//заполнение причин таблицы "AboutSubdivision"
function fillCauses(param, elOne, elTwo, elThree, elFour, elFive, elSix) {
    let tmp = '';
    if (param.match(/[а-я]+/gi)) tmp = param.match(/[а-я ]+(,)*/gi)[0];
    if (tmp[tmp.length - 1] === ',') tmp = tmp.slice(0, -1);
    switch (tmp) {
        case 'больница':
            elOne.innerHTML = +elOne.innerHTML + 1;
            break;
        case 'болен':
            elTwo.innerHTML = +elTwo.innerHTML + 1;
            break;
        case 'командировка':
            elThree.innerHTML = +elThree.innerHTML + 1;
            break;
        case 'отпуск':
            elFour.innerHTML = +elFour.innerHTML + 1;
            break;
        case 'дежурство':
            elFive.innerHTML = +elFive.innerHTML + 1;
            break;
        case 'другие причины':
            elSix.innerHTML = +elSix.innerHTML + 1;
            break;
        case 'после дежурства':
            elSix.innerHTML = +elSix.innerHTML + 1;
            break;
        case 'отпуск по уходу за ребенком':
            elSix.innerHTML = +elSix.innerHTML + 1;
            break;
        case 'социальный отпуск':
            elSix.innerHTML = +elSix.innerHTML + 1;
            break;
    }
}

//подсчет суммы каждой строки таблицы "AboutSubdivision"
function calcSum(el) {
    let response = fetch('php/state.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    });
    response.then(json => json.json())
        .then(data => {
            let count = data['stateSubdivision'].length;
            let rows = el.children;
            for (let i = 0; i < rows.length; i++) {
                const tdSum = rows[i].children[count + 1];
                for (let y = 1; y < rows[i].children.length; y++) {
                    if (y < count + 1) {
                        const td = rows[i].children[y];
                        tdSum.innerHTML = +tdSum.innerHTML + +td.innerHTML;
                    }
                }
            }
        });
}

//проверка таблиц на наличие для последующего удаления
function checkTables() {
    let personnel = document.querySelector('table[name="tablePersonnel"]'),
        causes = document.querySelector('table[name="tableCauses"]'),
        title = document.querySelector('div[name="titlePage"]'),
        absense = document.querySelector('table[name="tableAbsense"]'),
        select = document.querySelector('select[name="addAbsense"]');
    if (personnel) {
        personnel.remove();
    }
    if (title) {
        title.remove();
    }
    if (causes) {
        causes.remove();
    }
    if (absense) {
        absense.remove();
    }
    if (select) {
        select.remove();
    }
    if (document.querySelector('div.rowInspektor')) document.querySelector('div.rowInspektor').remove();
    if (document.querySelector('input[name="sendData"]')) document.querySelector('input[name="sendData"]').remove();
    if (document.querySelector('form[name="authForm"]')) document.querySelector('form[name="authForm"]').remove();
    if (document.querySelector('table[name="tableAbsense"]')) document.querySelector('table[name="tableAbsense"]').remove();
}