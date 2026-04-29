# Context: Project Chimera (Ultra-Stealth Uniquifier)

## Vision
Développer l'outil ultime de "Deduplication Bypass" pour les plateformes sociales (IG/TikTok/YT Shorts). L'objectif est de générer une infinité de variantes à partir d'une seule source, chacune étant techniquement unique au niveau binaire et perceptuel, mais visuellement identique (SSIM > 0.995).

## Le Concept des 10+ Couches de Modification
Chaque variante doit passer par un pipeline de transformation multi-couches :
1.  **Binary Layer :** Randomisation des headers et injection de chunks de données inutiles.
2.  **Metadata Layer :** Scrubbing total + Injection de faux profils d'appareils (iPhone/Android).
3.  **Container Layer :** Modification des atomes MP4 (moov atom position) et du bitstream.
4.  **Spatial Layer :** Micro-shifting sub-pixel et cropping de <1%.
5.  **Temporal Layer :** Micro-trimming (suppression de 1-2 frames aléatoires) et ajustement de vitesse (0.999x).
6.  **Color Layer :** Altération infinitésimale des courbes de Gamma et de Luma.
7.  **Codec Layer :** Variation du GOP (Group of Pictures) et du profil d'encodage (Main vs High).
8.  **Audio Layer :** Ré-échantillonnage à 44.1kHz vs 48kHz et micro-bruit blanc inaudible.
9.  **Adversarial Layer :** Injection de bruit haute fréquence invisible pour briser les calculs de pHash.
10. **Quantization Layer :** Variation dynamique du CRF (Constant Rate Factor) par segment.