# Detailed anatomical models — Human Reference Atlas

These two GLB files are unmodified source models from the Human Reference Atlas (HRA), published by HuBMAP. They are used in a separate detailed-organ viewer. They are not substituted into the differently registered BodyParts3D / Z-Anatomy whole-body scene.

Retrieved on **29 October 2026** from the public `hubmapconsortium/hra-kg` source repository. The original `metadata.yaml` and `crosswalk.csv` files are preserved here as `heart-metadata.yaml`, `heart-crosswalk.csv`, `brain-metadata.yaml` and `brain-crosswalk.csv`.

## Licence and authors

Both source GLBs and their accompanying metadata are released under **[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**.

Creators: **Kristen Browne and Heidi Schlehlein**. Project lead: **Katy Börner**. Publisher: **HuBMAP**. Funding recorded by the source: National Institutes of Health, awards **OT2OD033756** and **OT2OD026671**.

The licences for the older body-atlas meshes remain separate and are documented in `../ATTRIBUTION.md` and `../License.txt`. This CC BY 4.0 notice applies to these HRA files, not to every anatomical asset in the application.

## Heart

- Citation: Browne, Kristen, and Heidi Schlehlein. 2024. “3D Reference Organ for Heart, Female v1.3.” [doi:10.48539/HBM449.SHRV.225](https://doi.org/10.48539/HBM449.SHRV.225).
- Original filename: `3d-vh-f-heart.glb`; local filename: `../hra-heart.glb`.
- Source version: **v1.3**. Reviewer recorded in the original metadata: **Shin Lin**.
- Data provenance: **Visible Human Dataset**, National Library of Medicine. The source cites Spitzer and Whitlock (2002), “The Visible Human Dataset: The Anatomical Platform for Human Simulation.”
- [HRA digital object](https://apps.humanatlas.io/kg-explorer/ref-organ/heart-female/v1.3)
- [Source GLB](https://github.com/hubmapconsortium/hra-kg/blob/main/digital-objects/ref-organ/heart-female/v1.3/raw/3d-vh-f-heart.glb)
- [Versioned HRA download](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-female/v1.3/assets/3d-vh-f-heart.glb)
- Exact source Git blob SHA: `750adbdaf5e43ece6bbbeaa8a283ebb0b7b20f5c`.
- Bytes: **1,745,560**. Parsed geometry: **14 named meshes, 85,914 triangles**.

The 17 crosswalk rows include parent groups. The 14 actual mesh surfaces consist of four chambers, the interventricular septum, four valves and five papillary-muscle surfaces. Source names and ontology mappings are retained. Some source papillary-muscle labels are unusually specific; the Russian labels translate the original crosswalk rather than changing the source's anatomical assignments.

## Brain

- Citation: Browne, Kristen, and Heidi Schlehlein. 2024. “3D Reference Organ for Brain, Female v1.4.” [doi:10.48539/HBM674.NTLM.353](https://doi.org/10.48539/HBM674.NTLM.353).
- Original filename: `3d-allen-f-brain.glb`; local filename: `../hra-brain.glb`.
- Source version: **v1.4**. Reviewer recorded in the original metadata: **Song-Lin Ding**.
- Data provenance: **Allen human brain reference atlas**, using Ding et al. (2016), “Comprehensive Cellular-Resolution Atlas of the Adult Human Brain,” and scaled to the **Visible Human** bodies.
- The original metadata explicitly states that **141 anatomical structures were mirrored to form a whole brain**. This model therefore does not represent natural interhemispheric asymmetry or all individual variation.
- [HRA digital object](https://apps.humanatlas.io/kg-explorer/ref-organ/brain-female/v1.4)
- [Source GLB](https://github.com/hubmapconsortium/hra-kg/blob/main/digital-objects/ref-organ/brain-female/v1.4/raw/3d-allen-f-brain.glb)
- [Versioned HRA download](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.4/assets/3d-allen-f-brain.glb)
- Exact source Git blob SHA: `f854b1a4566e3025a1519bc38b78878da882b726`.
- Bytes: **11,983,380**. Parsed geometry: **283 named meshes, 656,268 triangles**: 141 surfaces on each side, plus the optic chiasm.

The official crosswalk contains **108 rows**, including five groups. It directly maps **103 mesh surfaces**. A further **180 surfaces** have explicit anatomical names in the GLB but no row in that crosswalk. Their display names translate the source GLB names; their ontology identifiers remain `null`. No missing mappings or meshes are invented.

## Display changes and interpretation

- The GLB files are preserved byte for byte. Geometry, segmentation and source node names are unchanged.
- Russian display labels and navigation groups are provided by ANATOMIA in `anatomical-parts.js`. They are interface annotations, not changes to the source atlas.
- Source coordinates are in metres. Both models have superior along +Y and anterior along +Z. In the brain source, all 141 nodes labelled `_L` are at smaller X than their paired `_R` nodes. The detailed viewer applies a documented wrapper transform `[-1, 1, 1]` to the brain so that patient-left is +X consistently with the heart and the main atlas. The source file itself is not reflected or rewritten. The heart uses `[1, 1, 1]`.
- Colours, material settings and lighting may be adjusted for legibility; colours do not indicate measured tissue properties or a patient's condition.
- Hiding a group, changing opacity or moving a clipping plane changes visibility of existing source surfaces. It does not reconstruct absent tissues or create a medically validated section image.
- Optional section caps are illustrative closed surfaces. They can obscure internal spaces and should not be interpreted as tissue histology.
- These are educational reference models. No claim of a complete anatomical atlas, patient-specific anatomy or clinical validation is made.

General HRA citation: Browne, Kristen, Heidi Schlehlein, Bruce W. Herr II, Ellen Quardokus, Andreas Bueckle, and Katy Börner. 2024. “HuBMAP CCF 3D Reference Object Library.” [Human Reference Atlas 3D Reference Object Library](https://humanatlas.io/3d-reference-library).
