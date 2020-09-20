export default class TagInput {

    inputData;
    outputData;
    element;

    constructor(data) {
        this.inputData = data;
        this.outputData = data;
        this.render();
        this.initEventListeners();
    }

    render(){
        this.element = document.createElement('div', this.className = 'form-group mb-0 mr-3');
        this.element.innerHTML = `
            <label>Толщина</label>
            <div class="form-control tag-input" tabindex="10">
                <div class="tags"></div>
                <div class="input" contenteditable="true"></div>
            </div>
        `
        this.inputData.forEach(el => {
            let span = document.createElement('span');
            span.className = 'span-tag';
            span.innerHTML = `${el}<span>&times;</span>`;
            this.element.querySelector('.tags').append(span);
        });
    }

    dataChanged(){
        this.element.dispatchEvent(new CustomEvent('data-changed', {
            bubbles: true,
            detail: this.outputData
          }));
    }
  
    initEventListeners(){
        this.element.addEventListener('click', ({target}) => {
            if (target.parentNode.className == 'span-tag') {
                const elRemove = target.parentNode;
                elRemove.remove();
                const numRemove = elRemove.innerText.substring(0, elRemove.innerText.length - 1);
                for (let i = 0; i < this.outputData.length; i++) {
                    const el = this.outputData[i];
                    if (el == numRemove) {
                        this.outputData.splice(i,1);
                        break;
                    }
                }
            }
            else{
                const tagInput = target.closest('.tag-input');
                tagInput?.classList.add('focus');
                this.element.querySelector('.tag-input .input').focus();
            }
        })
        
        document.addEventListener('click', ({target}) => {
            const tagInput = target.closest('.tag-input');
            if (!tagInput) {
                document.querySelector('.tag-input').classList.remove('focus');
            }
        }, true)
        
        this.element.querySelector('.input').addEventListener('keydown', ({key}) => {
            if (key == 'Enter') {
                let isValid = true;
                this.element.querySelector('.input').blur();
                this.element.querySelector('.tag-input').classList.remove('focus');
                const tagValue = parseInt(this.element.querySelector('.input').innerText);
                this.element.querySelector('.input').innerHTML = null;
                for(let el of this.outputData){
                    if (el != tagValue) {
                        isValid = true;
                    }
                    else{
                        isValid = false;
                        break;
                    }
                }
                if (!isNaN(tagValue) && isValid) {
                    this.outputData.push(tagValue);
                    let span = document.createElement('span');
                    span.className = 'span-tag';
                    span.innerHTML = `${tagValue}<span>&times;</span>`;
                    this.element.querySelector('.tags').append(span);
                }
            }
        })
    }
  }
