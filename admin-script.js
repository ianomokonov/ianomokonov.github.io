import TagInput from "./tag-input.js";


if (!sessionStorage.getItem('adminToken') && !localStorage.getItem('adminToken')) {
    $('#authModal').modal({
        backdrop: 'static',
        keyboard: false
    })
}

let data = null;
fetch('data.json').then((response) => {
  response.json().then(d => {
    data = d;
    setData(data);
    console.log(data);
  });
})

function setData(dataSet){
    for (const [key, value] of Object.entries(dataSet)) {
        document.querySelectorAll('.' + key).forEach(el => {
            let children = el.querySelectorAll('[data-child]');
            if (children.length != 0) {
                children.forEach(child => {
                    for (const [k, val] of Object.entries(value.children)) {
                        if (child.dataset.child == k) {
                            child.querySelectorAll(['[data-type]']).forEach(input => {
                                let str = input.dataset.type.split('-');
                                if (str[0] == 'price') {
                                    input.value = val.price;
                                }
                                for (const [k, v] of Object.entries(val.fields)){
                                    if (k == str[0]) {
                                        if (str[2]) {
                                            input.value = v.values[str[2]][str[1]];
                                        }
                                        else{
                                            input.value = v[str[1]];
                                        }
                                    }
                                    if (k == 'thikness') {
                                        if(!child.querySelector('.thikness .tag-input')){
                                            let tableTags = new TagInput(v);
                                            child.querySelector('.thikness').append(tableTags.element);
                                            tableTags.element.addEventListener('data-changed', ({detail}) => {
                                                v = detail || [];
                                            })
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
                        input.value = value.price;
                    }
                    else{
                        let str = input.dataset.type.split('-');
                        for (const [k, v] of Object.entries(value.fields)){
                            if (k == str[0]) {
                                if (str[2]) {
                                    input.value = v.values[str[2]][str[1]];
                                }
                                else{
                                    input.value = v[str[1]];
                                }
                            }
                        }
                    }
                })
            }
        });
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
                if (document.querySelector('#checkMe').checked) {
                    localStorage.setItem('adminToken', JSON.stringify(user));
                }
                sessionStorage.setItem('adminToken', JSON.stringify(user));
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
    for (const [key, value] of Object.entries(data)) {
        document.querySelectorAll('.' + key).forEach(el => {
            let children = el.querySelectorAll('[data-child]');
            if (children.length != 0) {
                children.forEach(child => {
                    for (const [k, val] of Object.entries(value.children)) {
                        if (child.dataset.child == k) {
                            child.querySelectorAll(['[data-type]']).forEach(input => {
                                let str = input.dataset.type.split('-');
                                if (str[0] == 'price') {
                                    val.price = input.value;
                                }
                                for (const [k, v] of Object.entries(val.fields)){
                                    if (k == str[0] && k != 'thikness') {
                                        if (str[2]) {
                                            v.values[str[2]][str[1]] = input.value;
                                        }
                                        else{
                                            v[str[1]] = input.value;
                                        }
                                    }
                                    if (k == 'thikness') {
                                        v.sort((a,b) => { return a-b });
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
                        value.price = input.value;
                    }
                    else{
                        let str = input.dataset.type.split('-');
                        for (const [k, v] of Object.entries(value.fields)){
                            if (k == str[0]) {
                                if (str[2]) {
                                    v.values[str[2]][str[1]] = input.value;
                                }
                                else{
                                    v[str[1]] = input.value;
                                }
                            }
                        }
                    }
                })
            }
        });
    }
    fetch('./repository.php?key=data-save', {
        method: 'POST',
        body: JSON.stringify(data)
    }).then((response) => {
        response.json().then((result) => {
            // console.log(result);
        })});
})