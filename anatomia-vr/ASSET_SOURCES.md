# Anatomical mesh assets

These are educational anatomical mesh derivatives. The application uses real source surfaces, with selected structures grouped and simplified for interactive display. Surface simplification is a visual level-of-detail operation, not a validated anatomical reconstruction. Colours are illustrative.

## Source and attribution

- **BodyParts3D — The Database Center for Life Science — CC BY-SA 2.1 Japan**: https://lifesciencedb.jp/bp3d/ and https://creativecommons.org/licenses/by-sa/2.1/jp/
- **Z-Anatomy — The open source atlas of anatomy — CC BY-SA 4.0**: https://www.z-anatomy.com/ and https://creativecommons.org/licenses/by-sa/4.0/
- Distribution used: https://github.com/nqwrc/3d-anatomy/tree/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/public/models
- Retrieved 14 October 2026. The original upstream notice is preserved verbatim in `License.txt`.

The upstream notice additionally identifies adapted components from Brainder / White matter (University of Washington), Cranial Nerves and Foramina (University of Dundee, CAHID, CC BY 4.0), Anatomy of the Inner Ear (University of Dundee School of Medicine, CC BY-NC-SA 4.0), and Kidney (lissiecowley, CC BY-NC 4.0). The subset contains kidney meshes and brain structures; all applicable original terms remain in force. Do not describe the entire anatomical dataset as MIT licensed or as free of noncommercial restrictions. The inner-ear structures are not included in the displayed subset.

## Modifications

`atlas.glb` contains 16 organ categories. Original source world transformations were baked into vertices, left/right orientation retained, source surfaces combined by organ, and geometry simplified with volume-preserving quadric decimation. Normals were recomputed. Original structure names are retained in glTF `extras.sourceNames`.

`skeleton-context.glb` contains a simplified supporting torso skeleton (ribs, costal cartilages, vertebrae, clavicles, scapulae, sternum and pelvis). The skull and limbs are omitted to avoid obscuring the atlas. Source names remain in glTF extras.

Model units are metres. Y is superior (up); +X is the subject's anatomical left; +Z is anterior. The modeled anatomy is a source-specific anatomical example and does not represent all individual variation.

The small-intestine category represents the duodenum and jejunum supplied by the source. The large-intestine category represents the selected colon segments and vermiform appendix; it is not a complete bowel reconstruction. The heart category includes chambers, selected valves and major proximal vessels. The brain category includes cortical structures, cerebellum and selected brainstem surfaces; it is not a complete neuroanatomical atlas.

Redistributed mesh derivatives retain the applicable Creative Commons conditions from their sources. This file records attribution and modifications; it does not replace those licences.

## College MEDSI logo

`assets/medsi-college-logo.png`: original transparent PNG supplied by the user
on 2026-10-28 for the requested college branding. Used byte-for-byte unchanged;
2048 × 504 pixels. The college mark is not covered by this application's MIT
license. No logo was generated or substituted.


## Detailed organs added in 1.10

The independent 3D laboratory uses the original Human Reference Atlas / HuBMAP heart (v1.3) and brain (v1.4) GLB files under CC BY 4.0. Authors, reviewers, DOI identifiers, exact checksums, the brain source mirroring limitation and its display-axis normalization are documented in [models/hra/ATTRIBUTION.md](models/hra/ATTRIBUTION.md). These terms apply to the new HRA files and do not replace the licences of the original Z-Anatomy / BodyParts3D atlas.
