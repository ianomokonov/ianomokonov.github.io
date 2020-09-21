import TagInput from "./tag-input.js";

let data = null;

if (!sessionStorage.getItem('adminToken') && !localStorage.getItem('adminToken')) {
    $('#authModal').modal({
        backdrop: 'static',
        keyboard: false
    })
} else{
    loadData();
}


function loadData(){
    document.querySelector('.spinner').classList.add('d-flex');
    fetch('data.json').then((response) => {
        response.json().then(d => {
          data = d;
          dataAction('load');
          document.querySelector('.spinner').classList.remove('d-flex');
        });
      })
}

function dataAction(action){
    for (const [key, value] of Object.entries(data)) {
        document.querySelectorAll('.' + key).forEach(el => {
            let children = el.querySelectorAll('[data-child]');
            if (children.length != 0) {
                children.forEach(child => {
                    for (const [childKey, childValue] of Object.entries(value.children)) {
                        if (child.dataset.child == childKey) {
                            child.querySelectorAll(['[data-type]']).forEach(input => {
                                let [field, attribute, position] = input.dataset.type.split('-');
                                if (field == 'price') {
                                    if (action == 'load') {
                                        input.value = childValue.price;
                                    }
                                    if (action == 'save') {
                                        childValue.price = input.value;
                                    }
                                }
                                for (const [fieldKey, fieldValue] of Object.entries(childValue.fields)){
                                    if (fieldKey == field && fieldKey != 'thikness') {
                                        if (position) {
                                            if (action == 'load') {
                                                input.value = fieldValue.values[position][attribute];
                                            }
                                            if (action == 'save') {
                                                fieldValue.values[position][attribute] = input.value;
                                            }
                                        }
                                        else{
                                            if (action == 'load') {
                                                input.value = fieldValue[attribute];
                                            }
                                            if (action == 'save') {
                                                fieldValue[attribute] = input.value;
                                            }
                                        }
                                    }
                                    if (fieldKey == 'thikness') {
                                        if (action == 'load') {
                                            if(!child.querySelector('.thikness .tag-input')){
                                                let tableTags = new TagInput(fieldValue);
                                                child.querySelector('.thikness').append(tableTags.element);
                                                tableTags.element.addEventListener('data-changed', ({detail}) => {
                                                    fieldValue = detail || [];
                                                })
                                            }
                                        }
                                        if (action == 'save') {
                                            fieldValue.sort((a,b) => { return a-b });
                                        }
                                    }
                                }
                            })
                        }
                    }
                });
            }
            else{
                el.querySelectorAll('[data-type]').forEach(input => {
                    if (input.dataset.type == 'price') {
                        if (action == 'load') {
                            input.value = value.price;
                        }
                        if (action == 'save') {
                            value.price = input.value;
                        }
                    }
                    else{
                        let [field, attribute, position] = input.dataset.type.split('-');
                        for (const [fieldKey, fieldValue] of Object.entries(value.fields)){
                            if (fieldKey == field) {
                                if (position) {
                                    if (action == 'load') {
                                        input.value = fieldValue.values[position][attribute];
                                    }
                                    if (action == 'save') {
                                        fieldValue.values[position][attribute] = input.value;
                                    }
                                }
                                else{
                                    if (action == 'load') {
                                        input.value = fieldValue[attribute];
                                    }
                                    if (action == 'save') {
                                        fieldValue[attribute] = input.value;
                                    }
                                }
                            }
                        }
                    }
                })
            }
        });
    }
}

function showAlert(success, message){
    if (success) {
        let alert = document.querySelector('.alert-success');
        alert.innerHTML = message;
        alert.classList.remove('d-none');
        setTimeout(() => {
            alert.classList.add('d-none')
        }, 5000)
    }
    else{
        let alert = document.querySelector('.alert-danger');
        alert.innerHTML = message;
        alert.classList.remove('d-none');
        setTimeout(() => {
            alert.classList.add('d-none')
        }, 5000)
    }
}

document.querySelectorAll('.exit').forEach(tag => {
    tag.addEventListener('click', () => {
        document.location.replace('./');
    })
})

document.querySelector('.signOut').addEventListener('click', () => {
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('adminToken');
    document.location.replace('./');
})

document.querySelector('.signIn').addEventListener('click', () => {
    let user = {
        "login": document.querySelector('#inputLogin').value,
        "password": document.querySelector('#inputPassword').value
    };
    fetch('./repository.php?key=sign-in', {
        method: 'POST',
        body: JSON.stringify(user)
    }).then((response) => {
        response.json().then((result) => {
            if (result == true) {
                $('#authModal').modal('hide');
                if (document.querySelector('#saveMe').checked) {
                    localStorage.setItem('adminToken', JSON.stringify(user));
                }
                sessionStorage.setItem('adminToken', JSON.stringify(user));
                loadData();
            }
            else{
                let alertDiv = document.querySelector('.alertDiv');
                if (alertDiv) {
                    alertDiv.remove();
                }
                let message = document.createElement('div');
                message.className='alertDiv';
                message.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                    ${result.message}
                    </div>
                `
                document.querySelector('.enterForm').append(message);
            }
        })
      })
})

document.getElementById('dataSave').addEventListener('click', () => {
    document.querySelector('.spinner').classList.add('d-flex');
    if (sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken')) {
        dataAction('save');
        fetch('./repository.php?key=data-save', {
            method: 'POST',
            body: JSON.stringify(data)
        }).then((response) => {
            response.json().then((result) => {
                document.querySelector('.spinner').classList.remove('d-flex');
                showAlert(true, result.message);
            })});
    }
    else{
        document.querySelector('.spinner').classList.remove('d-flex');
        showAlert(false, 'Нет прав доступа');
    }
})