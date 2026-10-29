/**
 * Display manifest for the unmodified HRA reference organs.
 * Exact mesh IDs are tested against the original GLBs. Russian names translate
 * the official crosswalk where present; the remaining names translate the named
 * surfaces in the original GLB. An absent ontology mapping stays null.
 * UI groups aid selection; they are not histological layers or new anatomy.
 * Sources and unmodified metadata: ./models/hra/ATTRIBUTION.md
 */
export const detailedOrgans = {
  "heart": {
    "id": "heart",
    "title": "Сердце",
    "latin": "Cor",
    "file": "./models/hra-heart.glb",
    "bytes": 1745560,
    "meshCount": 14,
    "triangles": 85914,
    "source": {
      "publisher": "Human Reference Atlas · HuBMAP",
      "version": "1.3",
      "title": "3D Reference Organ for Heart, Female",
      "url": "https://apps.humanatlas.io/kg-explorer/ref-organ/heart-female/v1.3",
      "doi": "https://doi.org/10.48539/HBM449.SHRV.225",
      "download": "https://cdn.humanatlas.io/digital-objects/ref-organ/heart-female/v1.3/assets/3d-vh-f-heart.glb",
      "repository": "https://github.com/hubmapconsortium/hra-kg/blob/main/digital-objects/ref-organ/heart-female/v1.3/raw/3d-vh-f-heart.glb",
      "gitBlobSha": "750adbdaf5e43ece6bbbeaa8a283ebb0b7b20f5c",
      "authors": [
        "Kristen Browne",
        "Heidi Schlehlein"
      ],
      "reviewer": "Shin Lin",
      "data": "Visible Human Dataset, National Library of Medicine"
    },
    "license": {
      "name": "CC BY 4.0",
      "url": "https://creativecommons.org/licenses/by/4.0/"
    },
    "reference": "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy",
    "notes": [
      "14 отдельных поверхностей: камеры и перегородка, клапаны, сосочковые мышцы.",
      "Цвета помогают различать структуры; это условная учебная окраска.",
      "Модель основана на одном анатомическом образце Visible Human. Она не воспроизводит всё индивидуальное разнообразие.",
      "Группы можно скрывать и делать прозрачными. Они не являются гистологическими слоями стенки сердца."
    ],
    "groups": [
      {
        "id": "chambers",
        "label": "Камеры и перегородка",
        "description": "Четыре камеры и межжелудочковая перегородка.",
        "color": "#b66566"
      },
      {
        "id": "valves",
        "label": "Клапаны",
        "description": "Четыре клапана сердца.",
        "color": "#d1ad76"
      },
      {
        "id": "papillary",
        "label": "Сосочковые мышцы",
        "description": "Пять отдельных поверхностей сосочковых мышц из исходного набора.",
        "color": "#8b6590"
      }
    ],
    "parts": [
      {
        "id": "VH_F_interventricular_septum",
        "name": "Межжелудочковая перегородка",
        "group": "chambers",
        "description": "Разделяет правый и левый желудочки.",
        "sourceLabel": "interventricular septum",
        "ontologyId": "UBERON:0002094",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_left_cardiac_atrium",
        "name": "Левое предсердие",
        "group": "chambers",
        "description": "Принимает кровь, поступающую по лёгочным венам.",
        "sourceLabel": "left cardiac atrium",
        "ontologyId": "UBERON:0002079",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_left_ventricle",
        "name": "Левый желудочек",
        "group": "chambers",
        "description": "Направляет кровь в аорту и большой круг кровообращения.",
        "sourceLabel": "heart left ventricle",
        "ontologyId": "UBERON:0002084",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_right_cardiac_atrium",
        "name": "Правое предсердие",
        "group": "chambers",
        "description": "Принимает венозную кровь большого круга кровообращения.",
        "sourceLabel": "right cardiac atrium",
        "ontologyId": "UBERON:0002078",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_right_ventricle",
        "name": "Правый желудочек",
        "group": "chambers",
        "description": "Направляет кровь в лёгочный ствол и малый круг кровообращения.",
        "sourceLabel": "heart right ventricle",
        "ontologyId": "UBERON:0002080",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_papillary_muscle_of_heart_ant",
        "name": "Передняя сосочковая мышца левого желудочка",
        "group": "papillary",
        "description": "Название передано по таблице соответствий HRA. Сосочковые мышцы связаны со створками предсердно-желудочковых клапанов через сухожильные хорды.",
        "sourceLabel": "Anterior papillary muscle of left ventricle",
        "ontologyId": "FMA:7264",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_papillary_muscle_of_heart_antlat",
        "name": "Переднелатеральная головка латеральной сосочковой мышцы левого желудочка",
        "group": "papillary",
        "description": "Название этой части передано по таблице соответствий HRA.",
        "sourceLabel": "Anterolateral head of lateral papillary muscle of left ventricle",
        "ontologyId": "FMA:7265",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_papillary_muscle_of_heart_med",
        "name": "Перегородочная сосочковая мышца правого желудочка",
        "group": "papillary",
        "description": "Название этой части передано по таблице соответствий HRA.",
        "sourceLabel": "Septal papillary muscle of right ventricle",
        "ontologyId": "FMA:7262",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_papillary_muscle_of_heart_pos",
        "name": "Задняя сосочковая мышца правого желудочка",
        "group": "papillary",
        "description": "Название этой части передано по таблице соответствий HRA.",
        "sourceLabel": "Posterior papillary muscle of right ventricle",
        "ontologyId": "FMA:7261",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_papillary_muscle_of_heart_posmed",
        "name": "Заднемедиальная головка задней сосочковой мышцы левого желудочка",
        "group": "papillary",
        "description": "Название этой части передано по таблице соответствий HRA.",
        "sourceLabel": "Posteromedial head of posterior papillary muscle of left ventricle",
        "ontologyId": "FMA:7267",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_aortic_valve",
        "name": "Клапан аорты",
        "group": "valves",
        "description": "Расположен на выходе из левого желудочка в аорту.",
        "sourceLabel": "aortic valve",
        "ontologyId": "UBERON:0002137",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_pulmonary_valve",
        "name": "Клапан лёгочного ствола",
        "group": "valves",
        "description": "Расположен на выходе из правого желудочка в лёгочный ствол.",
        "sourceLabel": "pulmonary valve",
        "ontologyId": "UBERON:0002146",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_mitral_valve",
        "name": "Митральный клапан",
        "group": "valves",
        "description": "Расположен между левым предсердием и левым желудочком.",
        "sourceLabel": "mitral valve",
        "ontologyId": "UBERON:0002135",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "VH_F_tricuspid_valve",
        "name": "Трёхстворчатый клапан",
        "group": "valves",
        "description": "Расположен между правым предсердием и правым желудочком.",
        "sourceLabel": "tricuspid valve",
        "ontologyId": "UBERON:0002134",
        "labelOrigin": "crosswalk",
        "side": null
      }
    ],
    "featured": [
      "VH_F_left_ventricle",
      "VH_F_mitral_valve",
      "VH_F_interventricular_septum"
    ],
    "presets": [
      {
        "id": "all",
        "name": "Сердце целиком",
        "groups": [
          "chambers",
          "valves",
          "papillary"
        ]
      },
      {
        "id": "inside",
        "name": "Клапаны и мышцы",
        "groups": [
          "valves",
          "papillary"
        ]
      },
      {
        "id": "chambers",
        "name": "Камеры сердца",
        "groups": [
          "chambers"
        ]
      }
    ],
    "orientation": {
      "units": "m",
      "x": "left",
      "y": "superior",
      "z": "anterior"
    },
    "nativeToAtlasScale": [
      1,
      1,
      1
    ]
  },
  "brain": {
    "id": "brain",
    "title": "Головной мозг",
    "latin": "Encephalon",
    "file": "./models/hra-brain.glb",
    "bytes": 11983380,
    "meshCount": 283,
    "triangles": 656268,
    "source": {
      "publisher": "Human Reference Atlas · HuBMAP",
      "version": "1.4",
      "title": "3D Reference Organ for Brain, Female",
      "url": "https://apps.humanatlas.io/kg-explorer/ref-organ/brain-female/v1.4",
      "doi": "https://doi.org/10.48539/HBM674.NTLM.353",
      "download": "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.4/assets/3d-allen-f-brain.glb",
      "repository": "https://github.com/hubmapconsortium/hra-kg/blob/main/digital-objects/ref-organ/brain-female/v1.4/raw/3d-allen-f-brain.glb",
      "gitBlobSha": "f854b1a4566e3025a1519bc38b78878da882b726",
      "authors": [
        "Kristen Browne",
        "Heidi Schlehlein"
      ],
      "reviewer": "Song-Lin Ding",
      "data": "Allen Human Reference Atlas; Visible Human Dataset"
    },
    "license": {
      "name": "CC BY 4.0",
      "url": "https://creativecommons.org/licenses/by/4.0/"
    },
    "reference": "https://3d.nih.gov/entries/3DPX-020959?version=2",
    "notes": [
      "283 отдельные поверхности: 141 структура с каждой стороны и зрительный перекрёст.",
      "В исходном HRA-атласе структуры одной стороны зеркально дополнены до полного мозга и масштабированы под Visible Human. Естественная асимметрия так не воспроизводится.",
      "«Слева» и «справа» обозначают стороны модели. Срединные структуры также разделены на части в исходном файле.",
      "108 строк таблицы соответствий включают группы; часть поверхностей имеет только исходное имя GLB, без отдельного онтологического кода.",
      "Группы помогают открывать глубинные структуры. Это не клеточные или гистологические слои.",
      "Для единой ориентации сторон при показе отражена ось X: слева и справа определяются по меткам исходной модели. Исходный GLB не изменён."
    ],
    "groups": [
      {
        "id": "cortex",
        "label": "Кора и извилины",
        "description": "Показанные в исходном атласе корковые области и извилины.",
        "color": "#c19ba3"
      },
      {
        "id": "deep",
        "label": "Глубокие структуры",
        "description": "Подкорковые структуры, гиппокамп, таламус и гипоталамус с выделенными подразделениями.",
        "color": "#b3a074"
      },
      {
        "id": "paths",
        "label": "Белое вещество и пути",
        "description": "Отдельные проводящие пути, спайки и области белого вещества.",
        "color": "#d0c4a4"
      },
      {
        "id": "brainstem",
        "label": "Ствол мозга",
        "description": "Выделенные части среднего мозга, моста и продолговатого мозга.",
        "color": "#7a9ba5"
      },
      {
        "id": "cerebellum",
        "label": "Мозжечок",
        "description": "Части мозжечка и его ножки из исходной модели.",
        "color": "#8a9e7a"
      },
      {
        "id": "ventricles",
        "label": "Желудочки и каналы",
        "description": "Поверхности, обозначающие желудочки и соединяющие их каналы.",
        "color": "#82b4c0"
      },
      {
        "id": "olfactory",
        "label": "Обонятельные структуры",
        "description": "Обонятельные луковицы, тракты и выделенные области.",
        "color": "#aa93b2"
      }
    ],
    "parts": [
      {
        "id": "VH_F_optic_chiasm",
        "name": "Зрительный перекрёст",
        "group": "paths",
        "description": "",
        "sourceLabel": "optic chiasma",
        "ontologyId": "UBERON:0000959",
        "labelOrigin": "crosswalk",
        "side": null
      },
      {
        "id": "Allen_olfactory_bulb_L",
        "name": "Обонятельная луковица · слева",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "olfactory bulb",
        "ontologyId": "UBERON:0002264",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_anterior_olfactory_nucleus_L",
        "name": "Переднее обонятельное ядро · слева",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "anterior olfactory nucleus",
        "ontologyId": "UBERON:0002266",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_piriform_region_L",
        "name": "Грушевидная кора · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "piriform cortex",
        "ontologyId": "UBERON:0004725",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_frontal_agranular_insular_cortex_area_Fl_L",
        "name": "Лобная агранулярная островковая кора (Fl) · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontal agranular insular cortex area Fl",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_temporal_agranular_insular_cortex_area_Tl_L",
        "name": "Височная агранулярная островковая кора (Tl) · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "temporal agranular insular cortex area Tl",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_head_of_caudate_L",
        "name": "Головка хвостатого ядра · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "head of caudate",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_body_of_caudate_L",
        "name": "Тело хвостатого ядра · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "body of caudate",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_tail_of_caudate_L",
        "name": "Хвост хвостатого ядра · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "tail of caudate",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_putamen_L",
        "name": "Скорлупа · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "left putamen",
        "ontologyId": "UBERON:0008884",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_nucleus_accumbens_L",
        "name": "Прилежащее ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "nucleus accumbens",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_external_segment_of_globus_pallidus_L",
        "name": "Наружный сегмент бледного шара · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "external segment of globus pallidus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_internal_segment_of_globus_pallidus_L",
        "name": "Внутренний сегмент бледного шара · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "internal segment of globus pallidus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_claustrum_L",
        "name": "Ограда · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "claustrum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_basal_forebrain_L",
        "name": "Базальный передний мозг · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "basal forebrain",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_septal_nuclei_L",
        "name": "Ядра перегородки · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "septal nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_amygdaloid_complex_L",
        "name": "Миндалевидный комплекс · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "amygdaloid complex",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_anterior_amygdaloid_area_L",
        "name": "Передняя миндалевидная область · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "anterior amygdaloid area",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_central_nuclear_group_L",
        "name": "Центральная группа ядер · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "central nuclear group",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_lateral_nucleus_L",
        "name": "Латеральное ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "lateral nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_basolateral_nucleus_basal_nucleus_L",
        "name": "Базолатеральное ядро (базальное ядро) · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "basolateral nucleus basal nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_basomedial_nucleus_accessory_basal_nucleus_L",
        "name": "Базомедиальное ядро (добавочное базальное ядро) · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "basomedial nucleus accessory basal nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_anterior_cortical_nucleus_L",
        "name": "Переднее корковое ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "anterior cortical nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_posterior_cortical_nucleus_L",
        "name": "Заднее корковое ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "posterior cortical nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_medial_nucleus_L",
        "name": "Медиальное ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "medial nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_amygdalohippocampal_area_L",
        "name": "Миндалевидно-гиппокампальная область · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "amygdalohippocampal area",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_bed_nucleus_of_stria_terminalis_L",
        "name": "Ядро ложа терминальной полоски · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "bed nucleus of stria terminalis",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_thalamus_L",
        "name": "Таламус · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_anterior_nuclear_complex_of_thalamus_L",
        "name": "Передний ядерный комплекс таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "anterior nuclear complex of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_lateral_dorsal_nucleus_of_thalamus_L",
        "name": "Латеральное дорсальное ядро таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "lateral dorsal nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_mediodorsal_nucleus_of_thalamus_L",
        "name": "Медиодорсальное ядро таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "mediodorsal nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_reuniens_nucleus_medioventral_nucleus_of_thalamus_L",
        "name": "Соединяющее ядро таламуса (reuniens) · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "reuniens nucleus medioventral nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_lateral_posterior_nucleus_of_thalamus_L",
        "name": "Латеральное заднее ядро таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "lateral posterior nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_pulvinar_of_thalamus_L",
        "name": "Подушка таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "pulvinar of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_ventral_anterior_nucleus_of_thalamus_L",
        "name": "Вентральное переднее ядро таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral anterior nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_ventral_lateral_nucleus_of_thalamus_L",
        "name": "Вентральное латеральное ядро таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral lateral nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_ventral_posterior_lateral_nucleus_L",
        "name": "Вентральное заднелатеральное ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral posterior lateral nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_ventral_posterior_medial_nucleus_L",
        "name": "Вентральное заднемедиальное ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral posterior medial nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_dorsal_lateral_geniculate_nucleus_L",
        "name": "Дорсальное латеральное коленчатое ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "dorsal lateral geniculate nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_medial_geniculate_nuclei_L",
        "name": "Медиальные коленчатые ядра · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "medial geniculate nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_centromedian_nucleus_of_thalamus_L",
        "name": "Срединный центр таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "centromedian nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_parafascicular_nucleus_of_thalamus_L",
        "name": "Парафасцикулярное ядро таламуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "parafascicular nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_habenular_nuclei_L",
        "name": "Ядра поводка · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "habenular nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_pineal_body_L",
        "name": "Эпифиз · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "pineal body",
        "ontologyId": "UBERON:0001905",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_zona_incerta_L",
        "name": "Неопределённая зона · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "zona incerta",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_supraoptic_region_of_HTH_L",
        "name": "Супраоптическая область гипоталамуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "supraoptic region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_preoptic_region_of_HTH_L",
        "name": "Преоптическая область гипоталамуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "preoptic region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_tuberal_region_of_HTH_L",
        "name": "Бугорная область гипоталамуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "tuberal region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_white_matter_of_forebrain_L",
        "name": "Белое вещество переднего мозга · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "white matter of forebrain",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_anterior_commissure_L",
        "name": "Передняя спайка · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "anterior commissure",
        "ontologyId": "UBERON:0000935",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_corpus_callosum_L",
        "name": "Мозолистое тело · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "corpus callosum",
        "ontologyId": "UBERON:0002336",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_fornix_L",
        "name": "Свод мозга · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "fornix of brain",
        "ontologyId": "UBERON:0000052",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_mammillothalamic_tract_L",
        "name": "Сосцевидно-таламический пучок · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "mammillothalamic tract",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_optic_tract_L",
        "name": "Зрительный тракт · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "optic tract",
        "ontologyId": "UBERON:0001908",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_anterior_horn_of_lateral_ventricle_L",
        "name": "Передний рог бокового желудочка · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "anterior horn of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_body_of_lateral_ventricle_L",
        "name": "Тело бокового желудочка · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "body of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_posterior_horn_of_lateral_ventricle_L",
        "name": "Задний рог бокового желудочка · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "posterior horn of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_inferior_horn_of_lateral_ventricle_L",
        "name": "Нижний рог бокового желудочка · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "inferior horn of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_third_ventricle_L",
        "name": "Третий желудочек · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "third ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_cerebellar_vermis_L",
        "name": "Червь мозжечка · слева",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "cerebellar vermis",
        "ontologyId": "UBERON:0004720",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_cerebellar_deep_nuclei_L",
        "name": "Глубокие ядра мозжечка · слева",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "cerebellar deep nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_white_matter_of_hindbrain_L",
        "name": "Белое вещество заднего мозга · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "white matter of hindbrain",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_olfactory_tract_L",
        "name": "Обонятельный тракт · слева",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "olfactory tract",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_primary_motor_cortex_L",
        "name": "Первичная моторная кора · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "primary motor cortex",
        "ontologyId": "UBERON:0002703",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_superior_frontal_gyrus_L",
        "name": "Верхняя лобная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "superior frontal gyrus",
        "ontologyId": "UBERON:0002661",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_middle_frontal_gyrus_L",
        "name": "Средняя лобная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "middle frontal gyrus",
        "ontologyId": "UBERON:0002702",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_inferior_frontal_gyrus_triangular_part_L",
        "name": "Треугольная часть нижней лобной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "triangular part of inferior frontal gyrus",
        "ontologyId": "UBERON:0002629",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_inferior_frontal_gyrus_opercular_part_L",
        "name": "Покрышечная часть нижней лобной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "opercular part of inferior frontal gyrus",
        "ontologyId": "UBERON:0002980",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_gyrus_rectus_straight_gyrus_L",
        "name": "Прямая извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "gyrus rectus",
        "ontologyId": "UBERON:0004671",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_medial_orbital_gyrus_L",
        "name": "Медиальная глазничная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "medial orbital gyrus",
        "ontologyId": "UBERON:0002570",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_anterior_intermediate_orbital_gyrus_L",
        "name": "Передняя промежуточная глазничная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "intermediate orbital gyrus",
        "ontologyId": "UBERON:0002644",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_posterior_intermediate_orbital_gyrus_L",
        "name": "Задняя промежуточная глазничная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "intermediate orbital gyrus",
        "ontologyId": "UBERON:0002644",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_lateral_orbital_gyrus_L",
        "name": "Латеральная глазничная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "lateral orbital gyrus",
        "ontologyId": "UBERON:0002564",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_paracentral_lobule_rostral_part_L",
        "name": "Передняя часть парацентральной дольки · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "anterior segment of paracentral lobule",
        "ontologyId": "UBERON:0035932",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_frontal_operculum_L",
        "name": "Лобная покрышка · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontal operculum",
        "ontologyId": "UBERON:0002947",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_postcentral_gyrus_L",
        "name": "Постцентральная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "postcentral gyrus",
        "ontologyId": "UBERON:0002581",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_supraparietal_lobule_L",
        "name": "Верхняя теменная долька · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "supraparietal lobule",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_supramarginal_gyrus_L",
        "name": "Надкраевая извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "supramarginal gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_angular_gyrus_L",
        "name": "Угловая извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "angular gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_precuneus_L",
        "name": "Предклинье · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "precuneus cortex",
        "ontologyId": "UBERON:0006093",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_paracentral_lobule_caudal_part_L",
        "name": "Задняя часть парацентральной дольки · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "paracentral lobule caudal part",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_superior_temporal_gyrus_L",
        "name": "Верхняя височная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "superior temporal gyrus",
        "ontologyId": "UBERON:0002769",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_middle_temporal_gyrus_L",
        "name": "Средняя височная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "middle temporal gyrus",
        "ontologyId": "UBERON:0002771",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_inferior_temporal_gyrus_L",
        "name": "Нижняя височная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "inferior temporal gyrus",
        "ontologyId": "UBERON:0002751",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_occipitotemporal_fusiform_gyrus_temporal_part_L",
        "name": "Височная часть веретенообразной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "occipitotemporal fusiform gyrus temporal part",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_transverse_temporal_gyrus_Heschls_gyrus_L",
        "name": "Поперечная височная извилина (Гешля) · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "transverse temporal gyrus Heschls gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_planum_temporale_L",
        "name": "Височная площадка · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "planum temporale",
        "ontologyId": "UBERON:0022268",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_temporal_pole_L",
        "name": "Височный полюс · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "temporal pole",
        "ontologyId": "UBERON:0002576",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_planum_polare_L",
        "name": "Полярная площадка · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "planum polare",
        "ontologyId": "UBERON:0023861",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_occipital_pole_L",
        "name": "Затылочный полюс · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "occipital pole",
        "ontologyId": "UBERON:0002902",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_cuneus_L",
        "name": "Клин · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "cuneus cortex",
        "ontologyId": "UBERON:0006092",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_lingual_gyrus_medial_occipitotemporal_gyrus_L",
        "name": "Язычная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "lingual gyrus",
        "ontologyId": "UBERON:0002943",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_lateral_occipitotemporal_fusiform_gyrus_occipital_part_L",
        "name": "Затылочная часть веретенообразной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "occipital fusiform gyrus",
        "ontologyId": "UBERON:0022364",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_inferior_occipital_gyrus_L",
        "name": "Нижняя затылочная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "inferior occipital gyrus",
        "ontologyId": "UBERON:0014608",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_superior_occipital_gyrus_L",
        "name": "Верхняя затылочная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "superior occipital gyrus",
        "ontologyId": "UBERON:0002948",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_cingulate_gyrus_rostral_anterior_part_L",
        "name": "Передняя часть поясной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "anterior cingulate gyrus",
        "ontologyId": "UBERON:0002756",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_cingulate_gyrus_caudal_posterior_part_L",
        "name": "Задняя часть поясной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "posterior cingulate gyrus",
        "ontologyId": "UBERON:0002740",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_ingulo_parahippocampal_isthmus_L",
        "name": "Перешеек поясной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "isthmus of cingulate gyrus",
        "ontologyId": "UBERON:0002738",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_subcallosal_gyrus_parolfactory_gyrus_L",
        "name": "Подмозолистая извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "subcallosal area",
        "ontologyId": "UBERON:0003020",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_anterior_parahippocampal_gyrus_L",
        "name": "Передняя часть парагиппокампальной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "anterior parahippocampal gyrus",
        "ontologyId": "UBERON:0022383",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_posterior_parahippocampal_gyrus_L",
        "name": "Задняя часть парагиппокампальной извилины · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "posterior parahippocampal gyrus",
        "ontologyId": "UBERON:0002657",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_gyrus_ambiens_L",
        "name": "Окружающая извилина (gyrus ambiens) · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "gyrus ambiens",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_long_insular_gyri_L",
        "name": "Длинные извилины островка · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "long insular gyri",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_short_insular_gyri_L",
        "name": "Короткие извилины островка · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "short insular gyri",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_limen_insula_L",
        "name": "Порог островка · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "limen insula",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_pretectal_region_L",
        "name": "Предкрышечная область · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pretectal region",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_substantia_nigra_L",
        "name": "Чёрная субстанция · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "substantia nigra",
        "ontologyId": "UBERON:0002038",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_superior_colliculus_L",
        "name": "Верхний холмик · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "superior colliculus",
        "ontologyId": "UBERON:0001945",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_cerebral_peduncle_crus_cerebri_L",
        "name": "Основание ножки мозга · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "cerebral peduncle",
        "ontologyId": "UBERON:0002623",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_superior_cerebellar_peduncle_brachium_conjunctivum_L",
        "name": "Верхняя ножка мозжечка · слева",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "superior cerebellar peduncle brachium conjunctivum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_cerebral_aqueduct_L",
        "name": "Водопровод мозга · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "cerebral aqueduct",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_paravermis_of_cerebellum_L",
        "name": "Промежуточная зона мозжечка (паравермис) · слева",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "paravermis of cerebellum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_lateral_hemisphere_of_cerebellum_L",
        "name": "Латеральная часть полушария мозжечка · слева",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "lateral hemisphere of cerebellum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_basilar_part_of_pons_L",
        "name": "Основание моста · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pontine nuclear group",
        "ontologyId": "UBERON:0002151",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_pontine_tegmentum_L",
        "name": "Покрышка моста · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pontine tegmentum",
        "ontologyId": "UBERON:0003023",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_pyramidal_part_of_medulla_oblongata_L",
        "name": "Пирамидная часть продолговатого мозга · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pyramidal part of medulla oblongata",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_tegmentum_of_medulla_oblongata_L",
        "name": "Покрышка продолговатого мозга · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "tegmentum of medulla oblongata",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_inferior_olive_L",
        "name": "Нижняя олива · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "inferior olive",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_middle_cerebellar_peduncle_L",
        "name": "Средняя ножка мозжечка · слева",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "middle cerebellar peduncle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_fourth_ventricle_L",
        "name": "Четвёртый желудочек · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "fourth ventricle",
        "ontologyId": "UBERON:0002422",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_central_canal_of_medulla_oblongata_L",
        "name": "Центральный канал продолговатого мозга · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "central canal of medulla oblongata",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_midline_nuclear_complex_L",
        "name": "Срединный ядерный комплекс · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "midline nuclear complex",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_lateral_olfactory_gyrus_L",
        "name": "Латеральная обонятельная извилина · слева",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "lateral olfactory gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_parietal_operculum_L",
        "name": "Теменная покрышка · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "parietal operculum",
        "ontologyId": "UBERON:0002911",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_optic_radiation_L",
        "name": "Зрительная лучистость · слева",
        "group": "paths",
        "description": "",
        "sourceLabel": "optic radiation",
        "ontologyId": "UBERON:0022264",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_posteroventral_putamen_L",
        "name": "Задневентральная часть скорлупы · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "posteroventral putamen",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_atrium_of_lateral_ventricle_L",
        "name": "Треугольник бокового желудочка · слева",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "atrium of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_paracingulate_gyrus_L",
        "name": "Парапоясная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "paracingulate gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_rostral_gyrus_L",
        "name": "Ростральная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "rostral gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_frontomarginal_gyrus_L",
        "name": "Лобнокраевая извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontomarginal gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_frontal_pole_L",
        "name": "Лобный полюс · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontal pole",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_inferior_cerebellar_peduncle_L",
        "name": "Нижняя ножка мозжечка · слева",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "inferior cerebellar peduncle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_perirhinal_gyrus_rostral_part_of_FuGt_L",
        "name": "Периринальная извилина · слева",
        "group": "cortex",
        "description": "",
        "sourceLabel": "perirhinal gyrus rostral part of FuGt",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_head_of_hippocampus_L",
        "name": "Головка гиппокампа · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "head of hippocampus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_body_of_hippocampus_L",
        "name": "Тело гиппокампа · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "body of hippocampus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_tail_of_hippocampus_L",
        "name": "Хвост гиппокампа · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "tail of hippocampus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_olfactory_bulb_R",
        "name": "Обонятельная луковица · справа",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "olfactory bulb",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_anterior_olfactory_nucleus_R",
        "name": "Переднее обонятельное ядро · справа",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "anterior olfactory nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_piriform_region_R",
        "name": "Грушевидная кора · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "piriform region",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_frontal_agranular_insular_cortex_area_Fl_R",
        "name": "Лобная агранулярная островковая кора (Fl) · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontal agranular insular cortex area Fl",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_temporal_agranular_insular_cortex_area_Tl_R",
        "name": "Височная агранулярная островковая кора (Tl) · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "temporal agranular insular cortex area Tl",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_head_of_caudate_R",
        "name": "Головка хвостатого ядра · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "head of caudate",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_body_of_caudate_R",
        "name": "Тело хвостатого ядра · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "body of caudate",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_tail_of_caudate_R",
        "name": "Хвост хвостатого ядра · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "tail of caudate",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_putamen_R",
        "name": "Скорлупа · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "right putamen",
        "ontologyId": "UBERON:0008885",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_nucleus_accumbens_R",
        "name": "Прилежащее ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "nucleus accumbens",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_external_segment_of_globus_pallidus_R",
        "name": "Наружный сегмент бледного шара · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "external segment of globus pallidus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_internal_segment_of_globus_pallidus_R",
        "name": "Внутренний сегмент бледного шара · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "internal segment of globus pallidus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_claustrum_R",
        "name": "Ограда · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "claustrum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_basal_forebrain_R",
        "name": "Базальный передний мозг · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "basal forebrain",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_septal_nuclei_R",
        "name": "Ядра перегородки · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "septal nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_amygdaloid_complex_R",
        "name": "Миндалевидный комплекс · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "amygdaloid complex",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_anterior_amygdaloid_area_R",
        "name": "Передняя миндалевидная область · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "anterior amygdaloid area",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_central_nuclear_group_R",
        "name": "Центральная группа ядер · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "central nuclear group",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_lateral_nucleus_R",
        "name": "Латеральное ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "lateral nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_basolateral_nucleus_basal_nucleus_R",
        "name": "Базолатеральное ядро (базальное ядро) · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "basolateral nucleus basal nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_basomedial_nucleus_accessory_basal_nucleus_R",
        "name": "Базомедиальное ядро (добавочное базальное ядро) · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "basomedial nucleus accessory basal nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_anterior_cortical_nucleus_R",
        "name": "Переднее корковое ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "anterior cortical nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_posterior_cortical_nucleus_R",
        "name": "Заднее корковое ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "posterior cortical nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_medial_nucleus_R",
        "name": "Медиальное ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "medial nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_amygdalohippocampal_area_R",
        "name": "Миндалевидно-гиппокампальная область · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "amygdalohippocampal area",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_bed_nucleus_of_stria_terminalis_R",
        "name": "Ядро ложа терминальной полоски · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "bed nucleus of stria terminalis",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_thalamus_R",
        "name": "Таламус · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_anterior_nuclear_complex_of_thalamus_R",
        "name": "Передний ядерный комплекс таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "anterior nuclear complex of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_lateral_dorsal_nucleus_of_thalamus_R",
        "name": "Латеральное дорсальное ядро таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "lateral dorsal nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_mediodorsal_nucleus_of_thalamus_R",
        "name": "Медиодорсальное ядро таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "mediodorsal nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_reuniens_nucleus_medioventral_nucleus_of_thalamus_R",
        "name": "Соединяющее ядро таламуса (reuniens) · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "reuniens nucleus medioventral nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_lateral_posterior_nucleus_of_thalamus_R",
        "name": "Латеральное заднее ядро таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "lateral posterior nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_pulvinar_of_thalamus_R",
        "name": "Подушка таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "pulvinar of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_ventral_anterior_nucleus_of_thalamus_R",
        "name": "Вентральное переднее ядро таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral anterior nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_ventral_lateral_nucleus_of_thalamus_R",
        "name": "Вентральное латеральное ядро таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral lateral nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_ventral_posterior_lateral_nucleus_R",
        "name": "Вентральное заднелатеральное ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral posterior lateral nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_ventral_posterior_medial_nucleus_R",
        "name": "Вентральное заднемедиальное ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "ventral posterior medial nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_dorsal_lateral_geniculate_nucleus_R",
        "name": "Дорсальное латеральное коленчатое ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "dorsal lateral geniculate nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_medial_geniculate_nuclei_R",
        "name": "Медиальные коленчатые ядра · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "medial geniculate nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_centromedian_nucleus_of_thalamus_R",
        "name": "Срединный центр таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "centromedian nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_parafascicular_nucleus_of_thalamus_R",
        "name": "Парафасцикулярное ядро таламуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "parafascicular nucleus of thalamus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_habenular_nuclei_R",
        "name": "Ядра поводка · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "habenular nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_pineal_body_R",
        "name": "Эпифиз · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "pineal body",
        "ontologyId": "UBERON:0001905",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_zona_incerta_R",
        "name": "Неопределённая зона · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "zona incerta",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_supraoptic_region_of_HTH_R",
        "name": "Супраоптическая область гипоталамуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "supraoptic region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_white_matter_of_forebrain_R",
        "name": "Белое вещество переднего мозга · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "white matter of forebrain",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_anterior_commissure_R",
        "name": "Передняя спайка · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "anterior commissure",
        "ontologyId": "UBERON:0000935",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_corpus_callosum_R",
        "name": "Мозолистое тело · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "corpus callosum",
        "ontologyId": "UBERON:0002336",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_fornix_R",
        "name": "Свод мозга · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "fornix of brain",
        "ontologyId": "UBERON:0000052",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_mammillothalamic_tract_R",
        "name": "Сосцевидно-таламический пучок · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "mammillothalamic tract",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_optic_tract_R",
        "name": "Зрительный тракт · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "optic tract",
        "ontologyId": "UBERON:0001908",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_anterior_horn_of_lateral_ventricle_R",
        "name": "Передний рог бокового желудочка · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "anterior horn of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_body_of_lateral_ventricle_R",
        "name": "Тело бокового желудочка · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "body of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_posterior_horn_of_lateral_ventricle_R",
        "name": "Задний рог бокового желудочка · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "posterior horn of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_inferior_horn_of_lateral_ventricle_R",
        "name": "Нижний рог бокового желудочка · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "inferior horn of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_third_ventricle_R",
        "name": "Третий желудочек · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "third ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_cerebellar_vermis_R",
        "name": "Червь мозжечка · справа",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "cerebellar vermis",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_cerebellar_deep_nuclei_R",
        "name": "Глубокие ядра мозжечка · справа",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "cerebellar deep nuclei",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_white_matter_of_hindbrain_R",
        "name": "Белое вещество заднего мозга · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "white matter of hindbrain",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_olfactory_tract_R",
        "name": "Обонятельный тракт · справа",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "olfactory tract",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_primary_motor_cortex_R",
        "name": "Первичная моторная кора · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "primary motor cortex",
        "ontologyId": "UBERON:0002703",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_superior_frontal_gyrus_R",
        "name": "Верхняя лобная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "superior frontal gyrus",
        "ontologyId": "UBERON:0002661",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_middle_frontal_gyrus_R",
        "name": "Средняя лобная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "middle frontal gyrus",
        "ontologyId": "UBERON:0002702",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_inferior_frontal_gyrus_triangular_part_R",
        "name": "Треугольная часть нижней лобной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "triangular part of inferior frontal gyrus",
        "ontologyId": "UBERON:0002629",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_inferior_frontal_gyrus_opercular_part_R",
        "name": "Покрышечная часть нижней лобной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "opercular part of inferior frontal gyrus",
        "ontologyId": "UBERON:0002980",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_gyrus_rectus_straight_gyrus_R",
        "name": "Прямая извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "gyrus rectus",
        "ontologyId": "UBERON:0004671",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_medial_orbital_gyrus_R",
        "name": "Медиальная глазничная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "medial orbital gyrus",
        "ontologyId": "UBERON:0002570",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_anterior_intermediate_orbital_gyrus_R",
        "name": "Передняя промежуточная глазничная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "intermediate orbital gyrus",
        "ontologyId": "UBERON:0002644",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_posterior_intermediate_orbital_gyrus_R",
        "name": "Задняя промежуточная глазничная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "intermediate orbital gyrus",
        "ontologyId": "UBERON:0002644",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_lateral_orbital_gyrus_R",
        "name": "Латеральная глазничная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "lateral orbital gyrus",
        "ontologyId": "UBERON:0002564",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_paracentral_lobule_rostral_part_R",
        "name": "Передняя часть парацентральной дольки · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "anterior segment of paracentral lobule",
        "ontologyId": "UBERON:0035932",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_frontal_operculum_R",
        "name": "Лобная покрышка · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontal operculum",
        "ontologyId": "UBERON:0002947",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_postcentral_gyrus_R",
        "name": "Постцентральная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "postcentral gyrus",
        "ontologyId": "UBERON:0002581",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_supraparietal_lobule_R",
        "name": "Верхняя теменная долька · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "supraparietal lobule",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_supramarginal_gyrus_R",
        "name": "Надкраевая извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "supramarginal gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_angular_gyrus_R",
        "name": "Угловая извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "angular gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_precuneus_R",
        "name": "Предклинье · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "precuneus cortex",
        "ontologyId": "UBERON:0006093",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_paracentral_lobule_caudal_part_R",
        "name": "Задняя часть парацентральной дольки · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "paracentral lobule caudal part",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_superior_temporal_gyrus_R",
        "name": "Верхняя височная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "superior temporal gyrus",
        "ontologyId": "UBERON:0002769",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_middle_temporal_gyrus_R",
        "name": "Средняя височная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "middle temporal gyrus",
        "ontologyId": "UBERON:0002771",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_inferior_temporal_gyrus_R",
        "name": "Нижняя височная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "inferior temporal gyrus",
        "ontologyId": "UBERON:0002751",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_occipitotemporal_fusiform_gyrus_temporal_part_R",
        "name": "Височная часть веретенообразной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "occipitotemporal fusiform gyrus temporal part",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_transverse_temporal_gyrus_Heschls_gyrus_R",
        "name": "Поперечная височная извилина (Гешля) · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "transverse temporal gyrus Heschls gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_planum_temporale_R",
        "name": "Височная площадка · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "planum temporale",
        "ontologyId": "UBERON:0022268",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_temporal_pole_R",
        "name": "Височный полюс · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "temporal pole",
        "ontologyId": "UBERON:0002576",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_planum_polare_R",
        "name": "Полярная площадка · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "planum polare",
        "ontologyId": "UBERON:0023861",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_occipital_pole_R",
        "name": "Затылочный полюс · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "occipital pole",
        "ontologyId": "UBERON:0002902",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_cuneus_R",
        "name": "Клин · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "cuneus cortex",
        "ontologyId": "UBERON:0006092",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_lingual_gyrus_medial_occipitotemporal_gyrus_R",
        "name": "Язычная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "lingual gyrus",
        "ontologyId": "UBERON:0002943",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_lateral_occipitotemporal_fusiform_gyrus_occipital_part_R",
        "name": "Затылочная часть веретенообразной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "occipital fusiform gyrus",
        "ontologyId": "UBERON:0022364",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_inferior_occipital_gyrus_R",
        "name": "Нижняя затылочная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "inferior occipital gyrus",
        "ontologyId": "UBERON:0014608",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_superior_occipital_gyrus_R",
        "name": "Верхняя затылочная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "superior occipital gyrus",
        "ontologyId": "UBERON:0002948",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_cingulate_gyrus_rostral_anterior_part_R",
        "name": "Передняя часть поясной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "anterior cingulate gyrus",
        "ontologyId": "UBERON:0002756",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_cingulate_gyrus_caudal_posterior_part_R",
        "name": "Задняя часть поясной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "posterior cingulate gyrus",
        "ontologyId": "UBERON:0002740",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_ingulo_parahippocampal_isthmus_R",
        "name": "Перешеек поясной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "isthmus of cingulate gyrus",
        "ontologyId": "UBERON:0002738",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_subcallosal_gyrus_parolfactory_gyrus_R",
        "name": "Подмозолистая извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "subcallosal area",
        "ontologyId": "UBERON:0003020",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_anterior_parahippocampal_gyrus_R",
        "name": "Передняя часть парагиппокампальной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "anterior parahippocampal gyrus",
        "ontologyId": "UBERON:0022383",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_posterior_parahippocampal_gyrus_R",
        "name": "Задняя часть парагиппокампальной извилины · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "posterior parahippocampal gyrus",
        "ontologyId": "UBERON:0002657",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_gyrus_ambiens_R",
        "name": "Окружающая извилина (gyrus ambiens) · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "gyrus ambiens",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_long_insular_gyri_R",
        "name": "Длинные извилины островка · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "long insular gyri",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_short_insular_gyri_R",
        "name": "Короткие извилины островка · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "short insular gyri",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_limen_insula_R",
        "name": "Порог островка · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "limen insula",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_pretectal_region_R",
        "name": "Предкрышечная область · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pretectal region",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_red_nucleus_R",
        "name": "Красное ядро · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "red nucleus",
        "ontologyId": "UBERON:0001947",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_substantia_nigra_R",
        "name": "Чёрная субстанция · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "substantia nigra",
        "ontologyId": "UBERON:0002038",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_superior_colliculus_R",
        "name": "Верхний холмик · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "superior colliculus",
        "ontologyId": "UBERON:0001945",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_inferior_colliculus_R",
        "name": "Нижний холмик · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "inferior colliculus",
        "ontologyId": "UBERON:0001946",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_cerebral_peduncle_crus_cerebri_R",
        "name": "Основание ножки мозга · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "cerebral peduncle",
        "ontologyId": "UBERON:0002623",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_superior_cerebellar_peduncle_brachium_conjunctivum_R",
        "name": "Верхняя ножка мозжечка · справа",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "superior cerebellar peduncle brachium conjunctivum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_cerebral_aqueduct_R",
        "name": "Водопровод мозга · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "cerebral aqueduct",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_paravermis_of_cerebellum_R",
        "name": "Промежуточная зона мозжечка (паравермис) · справа",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "paravermis of cerebellum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_lateral_hemisphere_of_cerebellum_R",
        "name": "Латеральная часть полушария мозжечка · справа",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "lateral hemisphere of cerebellum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_basilar_part_of_pons_R",
        "name": "Основание моста · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pontine nuclear group",
        "ontologyId": "UBERON:0002151",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_pontine_tegmentum_R",
        "name": "Покрышка моста · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pontine tegmentum",
        "ontologyId": "UBERON:0003023",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_pyramidal_part_of_medulla_oblongata_R",
        "name": "Пирамидная часть продолговатого мозга · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "pyramidal part of medulla oblongata",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_tegmentum_of_medulla_oblongata_R",
        "name": "Покрышка продолговатого мозга · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "tegmentum of medulla oblongata",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_inferior_olive_R",
        "name": "Нижняя олива · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "inferior olive",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_inferior_cerebellar_peduncle_R",
        "name": "Нижняя ножка мозжечка · справа",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "inferior cerebellar peduncle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_middle_cerebellar_peduncle_R",
        "name": "Средняя ножка мозжечка · справа",
        "group": "cerebellum",
        "description": "",
        "sourceLabel": "middle cerebellar peduncle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_fourth_ventricle_R",
        "name": "Четвёртый желудочек · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "fourth ventricle",
        "ontologyId": "UBERON:0002422",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_central_canal_of_medulla_oblongata_R",
        "name": "Центральный канал продолговатого мозга · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "central canal of medulla oblongata",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_midline_nuclear_complex_R",
        "name": "Срединный ядерный комплекс · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "midline nuclear complex",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_lateral_olfactory_gyrus_R",
        "name": "Латеральная обонятельная извилина · справа",
        "group": "olfactory",
        "description": "",
        "sourceLabel": "lateral olfactory gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_parietal_operculum_R",
        "name": "Теменная покрышка · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "parietal operculum",
        "ontologyId": "UBERON:0002911",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_optic_radiation_R",
        "name": "Зрительная лучистость · справа",
        "group": "paths",
        "description": "",
        "sourceLabel": "optic radiation",
        "ontologyId": "UBERON:0022264",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_posteroventral_putamen_R",
        "name": "Задневентральная часть скорлупы · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "posteroventral putamen",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_atrium_of_lateral_ventricle_R",
        "name": "Треугольник бокового желудочка · справа",
        "group": "ventricles",
        "description": "",
        "sourceLabel": "atrium of lateral ventricle",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_paracingulate_gyrus_R",
        "name": "Парапоясная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "paracingulate gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_rostral_gyrus_R",
        "name": "Ростральная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "rostral gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_frontomarginal_gyrus_R",
        "name": "Лобнокраевая извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontomarginal gyrus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_frontal_pole_R",
        "name": "Лобный полюс · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "frontal pole",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_perirhinal_gyrus_rostral_part_of_FuGt_R",
        "name": "Периринальная извилина · справа",
        "group": "cortex",
        "description": "",
        "sourceLabel": "perirhinal gyrus rostral part of FuGt",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_hypothalamus_L",
        "name": "Гипоталамус · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "hypothalamus",
        "ontologyId": "UBERON:0001898",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_hypothalamus_R",
        "name": "Гипоталамус · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "hypothalamus",
        "ontologyId": "UBERON:0001898",
        "labelOrigin": "crosswalk",
        "side": "R"
      },
      {
        "id": "Allen_subthalamic_nucleus_R",
        "name": "Субталамическое ядро · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "subthalamic nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_mammillary_region_of_HTH_R",
        "name": "Сосцевидная область гипоталамуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "mammillary region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_midbrain_tegmentum_R",
        "name": "Покрышка среднего мозга · справа",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "midbrain tegmentum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_tuberal_region_of_HTH_R",
        "name": "Бугорная область гипоталамуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "tuberal region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_preoptic_region_of_HTH_R",
        "name": "Преоптическая область гипоталамуса · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "preoptic region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_midbrain_tegmentum_L",
        "name": "Покрышка среднего мозга · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "midbrain tegmentum",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_red_nucleus_L",
        "name": "Красное ядро · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "red nucleus",
        "ontologyId": "UBERON:0001947",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_inferior_colliculus_L",
        "name": "Нижний холмик · слева",
        "group": "brainstem",
        "description": "",
        "sourceLabel": "inferior colliculus",
        "ontologyId": "UBERON:0001946",
        "labelOrigin": "crosswalk",
        "side": "L"
      },
      {
        "id": "Allen_mammillary_region_of_HTH_L",
        "name": "Сосцевидная область гипоталамуса · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "mammillary region of HTH",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_subthalamic_nucleus_L",
        "name": "Субталамическое ядро · слева",
        "group": "deep",
        "description": "",
        "sourceLabel": "subthalamic nucleus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "L"
      },
      {
        "id": "Allen_head_of_hippocampus_R",
        "name": "Головка гиппокампа · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "head of hippocampus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_body_of_hippocampus_R",
        "name": "Тело гиппокампа · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "body of hippocampus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      },
      {
        "id": "Allen_tail_of_hippocampus_R",
        "name": "Хвост гиппокампа · справа",
        "group": "deep",
        "description": "",
        "sourceLabel": "tail of hippocampus",
        "ontologyId": null,
        "labelOrigin": "mesh-name",
        "side": "R"
      }
    ],
    "featured": [
      "Allen_head_of_hippocampus_L",
      "Allen_thalamus_L",
      "Allen_corpus_callosum_L",
      "Allen_fourth_ventricle_L"
    ],
    "presets": [
      {
        "id": "all",
        "name": "Мозг целиком",
        "groups": [
          "cortex",
          "deep",
          "paths",
          "brainstem",
          "cerebellum",
          "ventricles",
          "olfactory"
        ]
      },
      {
        "id": "deep",
        "name": "Открыть глубину",
        "groups": [
          "deep",
          "paths",
          "brainstem",
          "cerebellum",
          "ventricles",
          "olfactory"
        ]
      },
      {
        "id": "ventricles",
        "name": "Желудочковая система",
        "groups": [
          "ventricles"
        ]
      },
      {
        "id": "stem",
        "name": "Ствол и мозжечок",
        "groups": [
          "brainstem",
          "cerebellum"
        ]
      }
    ],
    "orientation": {
      "units": "m",
      "x": "right",
      "y": "superior",
      "z": "anterior"
    },
    "nativeToAtlasScale": [
      -1,
      1,
      1
    ]
  }
};

export function partForNode(organId,nodeName){
  return detailedOrgans[organId]?.parts.find(part=>part.id===nodeName) || null;
}
export function partsForGroup(organId,group){
  return detailedOrgans[organId]?.parts.filter(part=>part.group===group) || [];
}
