const width = {
  type: "number",
  koef: 1,
};
const height = {
  type: "number",
  koef: 1,
};
const frame = {
  type: "checkbox",
  price: 300,
};
const substrate = {
  type: "checkbox",
  price: 3000,
};
const quality = {
  type: "radio",
  values: [
    {
      name: "720dpi",
      koef: 1,
    },
    {
      name: "1440dpi",
      koef: 1.2,
    },
  ],
};

const flexy = {
  type: "radio",
  values: [
    {
      name: "Табличка в обрез",
      koef: 1,
    },
    {
      name: "Табличка с подгибкой",
      koef: 1.2,
    },
  ],
};
const plotter = {
  type: "radio",
  values: [
    {
      name: "1 цвет",
      measure: "m2",
      price: 1500,
    },
    {
      name: "2 цвета",
      measure: "m2",
      price: 3000,
    },
  ],
};
const lamination = {
  type: "checkbox",
  measure: "m2",
  koef: 1.45,
};
const perimeterCut = {
  type: "checkbox",
  measure: "m",
  price: 10,
};
const perimeterBonding = {
  type: "checkbox",
  measure: "m",
  price: 50,
};
const eyelets = {
  type: "number",
  measure: "th",
  price: 10,
};

const pvh = {
  name: "ПВХ",
  type: "number",
  measure: "step",
  price: 646,

  fields: {
    height: {
      ...height,
      max: 600,
    },
    width: {
      ...width,
      max: 600,
    },
    quality: quality,
    lamination: lamination,
    plotter: plotter,
    flexy: flexy,
    thikness: [3, 5],
  },
};

const composit = {
  name: "Композит",
  type: "number",
  price: 5000,

  fields: {
    height: {
      ...height,
      max: 600,
    },
    width: {
      ...width,
      max: 600,
    },
    quality: quality,
    lamination: lamination,
    plotter: plotter,
    flexy: flexy,
    thikness: [3],
  },
};

const akrile = {
  name: "Акрил",
  type: "number",
  measure: "step",
  price: 2500,

  fields: {
    height: {
      ...height,
      max: 600,
    },
    width: {
      ...width,
      max: 600,
    },
    quality: quality,
    lamination: lamination,
    plotter: plotter,
    flexy: flexy,
    thikness: [2, 3, 4, 5, 6, 8, 10],
  },
};

const data = {
  plotter: {
    name: "Плотерная резка",
    price: 1500,
    fields: {
      width,
      height,
    },
  },
  interior: {
    name: "Интерьерная печать",
    children: {
      film: {
        name: "Пленка",
        price: 550,
        fields: {
          width,
          height,
          quality,
          lamination,
          perimeterCut,
          count: true,
        },
      },
      bannerLaminated: {
        name: "Баннер ламинированный",
        price: 300,
        fields: {
          width,
          height,
          quality,
          perimeterCut,
          perimeterBonding,
          eyelets,
          count: true,
        },
      },
      bannerCast: {
        name: "Баннер Литой",
        price: 300,
        fields: {
          width,
          height,
          quality,
          perimeterCut,
          perimeterBonding,
          eyelets,
          count: true,
        },
      },
      posterPaper: {
        name: "Постерная бумага",
        price: 400,
        fields: {
          width,
          height,
          quality,
          perimeterCut,
          count: true,
        },
      },
      photoPaper: {
        name: "Фотобумага",
        price: 400,
        fields: {
          width,
          height,
          quality,
          perimeterCut,
          count: true,
        },
      },
      Backlit: {
        name: "Бэклит",
        price: 400,
        fields: {
          width,
          height,
          quality,
          perimeterCut,
          count: true,
        },
      },
      perforatedFilm: {
        name: "Перфорированная пленка",
        price: 400,
        fields: {
          width,
          height,
          quality,
          perimeterCut,
          count: true,
        },
      },
    },
  },
  table: {
    name: "Таблица",
    children: {
      pvh: pvh,
      composit: composit,
      akrile: akrile,
    },
  },
  stand: {
    name: "Стенд",
    children: {
      pvh: pvh,
      composit: composit,
      akrile: {
        ...akrile,
        fields: {
          height: {
            ...height,
            max: 600,
          },
          width: {
            ...width,
            max: 600,
          },
          quality: quality,
          lamination: lamination,
          plotter: plotter,
          flexy: flexy,
          thikness: [2, 3, 4, 5],
        },
      },
    },
  },
  letters: {
    name: "Объемные буквы",
    isLetters: true,
    fields: {
      height: height,
      frame: frame,
      substrate: substrate,
      count: true,
      "substrate-width": true,
      "substrate-height": true,
    },
  },
};
