# Product Requirements Document (PRD)

## Objectif Technique
Générer "N" variantes d'une vidéo source avec les contraintes suivantes :
- **SSIM (Structural Similarity) :** Score > 0.995 par rapport à l'original.
- **pHash Distance :** Distance de Hamming > 8 entre chaque variante.
- **Vitesse de traitement :** Utilisation de l'accélération matérielle si disponible.

## Fonctionnalités Clés
- **Mass Generator :** Un flag `--count N` pour générer N fichiers uniques.
- **10-Layer Pipeline :** Chaque fichier doit subir les 10 transformations définies dans `context.md`.
- **Validation Automatique :** Après génération, le script doit calculer le SSIM et le pHash pour valider que la variante est "Safe" (unique mais identique à l'œil).
- **Device Spoofing :** Rotation aléatoire de métadonnées (Marque, Modèle, Logiciel de montage, Coordonnées GPS factices).

## Workflow de sortie
`input/video.mp4` -> `output/variant_001.mp4`, `output/variant_002.mp4`...
Chaque fichier doit avoir une signature MD5 radicalement différente.