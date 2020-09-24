let data = null;
fetch("data.json").then((response) => {
  response.json().then((d) => {
    data = d;
    onTypeClick({});
  });
});
let currentType = null;
let currentCategory = null;
const fieldNames = [
  "width",
  "height",
  "quality",
  "flexy",
  "lamination",
  "perimeterCut",
  "perimeterBonding",
  "plotter",
  "eyelets",
  "thikness",
  "count",
  "substrate",
  "substrate-width",
  "substrate-height",
  "max-width-lable",
  "max-height-lable",
  "letter-height",
  "flatPocket",
  "volumePocket",
];

const fieldNodes = {};
let widthMaxListener;
let heightMaxListener;
function init() {
  try {
    clearFields();
    countBtn.addEventListener("click", onCountButtonClick);
    document.forms[0].elements.substrate[1].addEventListener(
      "change",
      onSubstrateChange
    );
    document.forms[0].elements.substrate[0].addEventListener(
      "change",
      onSubstrateChange
    );
    document.querySelectorAll("[data-type]").forEach((node, index) => {
      node.addEventListener("click", onTypeClick);
      if (!index) {
        node.click();
      }
    });
  } catch (error) {
    alert("init");
  }
}
fieldNames.forEach((name) => {
  fieldNodes[name] = document.querySelector(`.${name}`);
});
clearFields();

let onTypeClick = ({ target }) => {
  if (!data) {
    return;
  }
  let typeNode = null;
  if (target) {
    typeNode = target.closest("[data-type]");
  } else {
    typeNode = document.querySelector("[data-type='plotter']");
  }

  const item = data[typeNode.dataset.type];
  currentType = item;
  clearActiveItems("[data-type]");
  typeNode.classList.add("active");
  if (item.children) {
    setCategories(item.children);
  } else {
    setCategories([]);
    clearFields();
    showFields(Object.keys(currentType.fields));
    clearFields(["substrate-width", "substrate-height"]);
  }
  resultContainer.classList.remove("d-flex");
  resultContainer.classList.add("d-none");
  result.innerHTML = ``;
};

let onCategoryClick = ({ target }) => {
  if (!data) {
    return;
  }
  const categoryNode = target.closest("[data-category]");
  const item = currentType.children[categoryNode.dataset.category];
  currentCategory = item;
  clearActiveItems("[data-category]");
  categoryNode.classList.add("active");
  clearFields();
  if (widthMaxListener) {
    document.forms[0].elements["width"].removeEventListener(
      "input",
      widthMaxListener
    );
    document.forms[0].elements["width"].removeAttribute("max");
  }
  if (heightMaxListener) {
    document.forms[0].elements["height"].removeEventListener(
      "input",
      heightMaxListener
    );
    document.forms[0].elements["height"].removeAttribute("max");
  }
  const fieldsNames = Object.keys(currentCategory.fields);
  showFields(fieldsNames);
  setQualityPlotterListeners(fieldsNames.find((name) => name === "plotter"));
  setPocketListeners(fieldsNames.find((name) => name === "flatPocket"));
  
  resultContainer.classList.remove("d-flex");
  resultContainer.classList.add("d-none");
  result.innerHTML = ``;
};

let onCountButtonClick = () => {
  try {
    const value = getRawValue(
      Object.keys(
        currentType.fields ? currentType.fields : currentCategory.fields
      )
    );
    const sum = getSum(value);
    if (sum) {
      resultContainer.classList.remove("d-none");
      resultContainer.classList.add("d-flex");
      result.innerHTML = `Итого: ${sum.toFixed(2)} руб.`;
    }
  } catch (error) {
    alert(`onCountButtonClick: ${JSON.stringify(error)}`);
  }
};

let onSubstrateChange = ({ target }) => {
  if (target.value == 2) {
    showFields(["substrate-width", "substrate-height"]);
  } else {
    clearFields(["substrate-width", "substrate-height"]);
  }
};

countBtn.addEventListener("click", onCountButtonClick);
document.forms[0].elements.substrate[1].addEventListener(
  "change",
  onSubstrateChange
);
document.forms[0].elements.substrate[0].addEventListener(
  "change",
  onSubstrateChange
);

document.querySelectorAll("[data-type]").forEach((node, index) => {
  node.addEventListener("click", onTypeClick);
  if (!index) {
    node.click();
  }
});

function clearActiveItems(selector) {
  document.querySelectorAll(selector).forEach((node) => {
    node.classList.remove("active");
  });
}

function clearFields(fields = Object.keys(fieldNodes)) {
  document.forms[0].elements.width.value = null;
  document.forms[0].elements.height.value = null;
  fields.forEach((key) => {
    fieldNodes[key].classList.remove("d-block");
    fieldNodes[key].classList.add("d-none");
  });
}

function maxValidator(max) {
  return ({ target }) => {
    if (+target.value > max) {
      target.value = target.value.slice(0, target.value.length - 1);
    }
  };
}

const onQualityPlotterClick = ({ target }) => {
  let field = target.closest(".plotter");
  if (field) {
    setEnableClass(fieldNodes["plotter"], true);
    fieldNodes["lamination"].classList.remove('d-block');
    fieldNodes["lamination"].classList.add('d-none');
    setEnableClass(fieldNodes["quality"], false);
    return;
  }
  field = target.closest(".quality");
  setEnableClass(fieldNodes["plotter"], false);
  fieldNodes["lamination"].classList.add('d-block');
  fieldNodes["lamination"].classList.remove('d-none');
  setEnableClass(fieldNodes["quality"], true);
};

const onPocketClick = ({ target }) => {
  let field = target.closest(".flatPocket");
  if (field) {
    if (fieldNodes["flatPocket"].className.indexOf("enabled-field") > -1) {
      setEnableClass(fieldNodes["flatPocket"], false);
      return;
    }

    setEnableClass(fieldNodes["flatPocket"], true);
    setEnableClass(fieldNodes["volumePocket"], false);
    return;
  }
  field = target.closest(".volumePocket");
  if (fieldNodes["volumePocket"].className.indexOf("enabled-field") > -1) {
    setEnableClass(fieldNodes["volumePocket"], false);
    return;
  }
  setEnableClass(fieldNodes["flatPocket"], false);
  setEnableClass(fieldNodes["volumePocket"], true);
};

function setEnableClass(target, isEnabled) {
  if (isEnabled) {
    target.classList.add("enabled-field");
    target.classList.remove("disabled-field");
    return;
  }
  target.classList.add("disabled-field");
  target.classList.remove("enabled-field");
}

function setQualityPlotterListeners(listen) {
  if (listen) {
    fieldNodes["plotter"].addEventListener("click", onQualityPlotterClick);
    fieldNodes["quality"].addEventListener("click", onQualityPlotterClick);
    return;
  }
  fieldNodes["plotter"].removeEventListener("click", onQualityPlotterClick);
  fieldNodes["quality"].removeEventListener("click", onQualityPlotterClick);
}

function setPocketListeners(listen) {
  if (listen) {
    fieldNodes["flatPocket"].addEventListener("click", onPocketClick);
    fieldNodes["volumePocket"].addEventListener("click", onPocketClick);
    return;
  }
  fieldNodes["flatPocket"].removeEventListener("click", onPocketClick);
  fieldNodes["volumePocket"].removeEventListener("click", onPocketClick);
}

function showFields(names) {
  Object.keys(fieldNodes).forEach((key) => {
    if (!!names.find((name) => name === key)) {
      fieldNodes[key].classList.remove("d-none");
      fieldNodes[key].classList.add("d-block");
      if (key === "thikness") {
        const select = fieldNodes[key].querySelector("select");
        select.innerHTML = "";
        currentCategory.fields.thikness.forEach((th, index) => {
          const opt = document.createElement("option");
          opt.value = th;
          opt.textContent = `${th} мм`;
          select.append(opt);
        });
      }
      if (
        currentType &&
        currentType.fields &&
        currentType.fields[key].measure
      ) {
        fieldNodes[key].querySelector("input").placeholder =
          currentType.fields[key].measure;
      } else if (key == "height") {
        fieldNodes[key].querySelector("input").placeholder = "мм";
      }

      if (key === "plotter") {
        setEnableClass(fieldNodes[key], false);
      }
      if (key === "flexy") {
        document.querySelector('.flexy-type').innerHTML = currentCategory.fields["flexy"].name;
        document.querySelector('.flexy-cut').innerHTML = currentCategory.fields["flexy"].values[0].name;
        document.querySelector('.flexy-hem').innerHTML = currentCategory.fields["flexy"].values[1].name;
      }
      if (key === "quality" && !!names.find((name) => name === "plotter")) {
        setEnableClass(fieldNodes[key], true);
      }
      if (key === "flatPocket") {
        setEnableClass(fieldNodes["volumePocket"], false);
        setEnableClass(fieldNodes[key], true);
      }

      if (key === "max-width-lable") {
        fieldNodes[
          key
        ].innerHTML = `Максимальная ширина ${currentCategory.fields["max-width-lable"].value} мм.`;
        widthMaxListener = maxValidator(
          currentCategory.fields["max-width-lable"].value
        );
        document.forms[0].elements["width"].addEventListener(
          "input",
          widthMaxListener
        );
        document.forms[0].elements["width"].setAttribute(
          "max",
          currentCategory.fields["max-width-lable"].value
        );
      }
      if (key === "max-height-lable") {
        fieldNodes[
          key
        ].innerHTML = `Максимальная высота ${currentCategory.fields["max-height-lable"].value} мм.`;
        heightMaxListener = maxValidator(
          currentCategory.fields["max-height-lable"].value
        );
        document.forms[0].elements["height"].addEventListener(
          "input",
          heightMaxListener
        );
        document.forms[0].elements["height"].setAttribute(
          "max",
          currentCategory.fields["max-height-lable"].value
        );
      }
      if (key === "letter-height") {
        fieldNodes[
          key
        ].innerHTML = `От ${currentType.fields["letter-height"].min} до ${currentType.fields["letter-height"].max} см.`;
        heightMaxListener = maxValidator(
          currentType.fields["letter-height"].max
        );
        document.forms[0].elements["height"].addEventListener(
          "input",
          heightMaxListener
        );
        document.forms[0].elements["height"].setAttribute(
          "max",
          currentType.fields["letter-height"].max
        );
      }
    }
  });
}

function getRawValue(fields) {
  const value = {};
  fields.forEach((field) => {
    const elem = document.forms[0].elements[field];
    if (elem) {
      value[field] = elem.type === "checkbox" ? elem.checked : elem.value;
    }
  });
  return value;
}

function setErrors(value) {
  if (!value.width) {
    document.forms[0].elements["width"].classList.add("border-danger");
  } else {
    document.forms[0].elements["width"].classList.remove("border-danger");
  }
  if (!value.height) {
    document.forms[0].elements["height"].classList.add("border-danger");
  } else {
    document.forms[0].elements["height"].classList.remove("border-danger");
  }
  if (value.substrate == 2) {
    if (!value["substrate-width"]) {
      document.forms[0].elements["substrate-width"].classList.add("border-danger");
    } else {
      document.forms[0].elements["substrate-width"].classList.remove("border-danger");
    }
    if (!value["substrate-height"]) {
      document.forms[0].elements["substrate-height"].classList.add("border-danger");
    } else {
      document.forms[0].elements["substrate-height"].classList.remove("border-danger");
    }
  }
}

function getSum(value) {
  let sum = 0;
  let square = 0;
  let perimeter = 0;

  if (currentType.isLetters) {
    return getLettersSum(value);
  }

  if (value.width && value.height) {
    setErrors(value);
    const width = value.width / 1000;
    const height = value.height / 1000;
    square = width * height;
    perimeter = width * 2 + height * 2;
    sum =
      square *
      (currentType.children ? currentCategory.price : currentType.price);
  } else {
    setErrors(value);
    return;
  }
  if (value.thikness) {
    sum *= value.thikness;
  }
  if (
    value.quality &&
    (fieldNodes["quality"].classList.value.indexOf("enabled-field") > -1 ||
      !value.plotter)
  ) {
    sum *= value.quality;
  }
  if (
    value.plotter &&
    fieldNodes["plotter"].classList.value.indexOf("enabled-field") > -1
  ) {
    sum +=
      currentCategory.fields.plotter.values[+value.plotter - 1].price * square;
  }
  if (
    value.volumePocket &&
    fieldNodes["volumePocket"].classList.value.indexOf("enabled-field") > -1
  ) {
    sum +=
      currentCategory.fields.flatPocket.values[+value.volumePocket - 1].price *
      value.volumePocketCount;
  }
  if (
    value.flatPocket &&
    fieldNodes["flatPocket"].classList.value.indexOf("enabled-field") > -1
  ) {
    sum +=
      currentCategory.fields.flatPocket.values[+value.flatPocket - 1].price *
      value.flatPocketCount;
  }
  if (value.flexy) {
    sum *= value.flexy;
  }
  if (value.lamination) {
    sum *= currentCategory.fields.lamination.koef;
  }
  if (value.perimeterCut) {
    sum += perimeter * currentCategory.fields.perimeterCut.price;
  }
  if (value.perimeterBonding) {
    sum += perimeter * currentCategory.fields.perimeterBonding.price;
  }
  if (value.eyelets) {
    sum +=
      Math.ceil(perimeter / (value.eyelets / 1000) + 1) *
      currentCategory.fields.eyelets.price;
  }

  if (value.count) {
    const count = +value.count;
    sum *= value.count;
    if (count < 21 && count > 10) {
      sum *= 0.98;
    }
    if (count < 31 && count > 20) {
      sum *= 0.95;
    }
    if (count > 30) {
      sum *= 0.93;
    }
  }
  return sum;
}

function getLettersSum(value) {
  let sum = 0;
  setErrors(value);
  if (value.height) {
    if (value.height < 5) {
      document.forms[0].elements["height"].classList.add("border-danger");
      return;
    } else {
      document.forms[0].elements["height"].classList.remove("border-danger");
    }
    if (value.height >= 5 && value.height <= 15) {
      sum = (value.height) * 150;
    }
    if (value.height > 15 && value.height <= 40) {
      sum = (value.height) * 80;
    }
    if (value.height > 40 && value.height <= 50) {
      sum = (value.height) * 100;
    }
  }
  else{
    setErrors(value);
    return;
  }
  if (value.count) {
    sum *= value.count;
  }
  if (value.substrate == 1) {
    const count = +value.count;
    let wood = count % 7 ? Math.ceil(count / 7) * 2 : (count / 7) * 2;
    if (count < 7) {
      sum += 2 * currentType.fields.substrate.values[0].price;
    } else if (count > 6 && count < 15) {
      sum += 4 * currentType.fields.substrate.values[0].price;
    } else if (count > 14 && count < 22) {
      sum += 6 * currentType.fields.substrate.values[0].price;
    } else {
      sum += wood * currentType.fields.substrate.values[0].price;
    }
  }
  if (value.substrate == 2) {
    if (!value["substrate-width"] || !value["substrate-height"]) {
      return;
    }
    const square =
      (value["substrate-width"] / 1000) * (value["substrate-height"] / 1000);
    sum += square * currentType.fields.substrate.values[1].price;
  }
  return sum;
}

function setCategories(categories) {
  categoriesMenu.innerHTML = "";
  Object.keys(categories)
    .filter((key) => key !== "fields")
    .forEach((key, i) => {
      const node = document.createElement("div");

      node.innerHTML = `
          <li class="nav-item" data-category="${key}">
            <a class="nav-link" href="javascript:;">${categories[
              key
            ].name.toUpperCase()}</a>
          </li>`;
      const category = node.firstElementChild;
      category.addEventListener("click", onCategoryClick);
      if (!i) {
        category.click();
      }
      categoriesMenu.append(category);
    });
}
