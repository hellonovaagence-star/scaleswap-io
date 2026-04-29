# Technical Implementation Details

## 1. Mathématiques de Validation
Claude doit implémenter ces vérifications pour chaque sortie :
- **Hamming Distance ($d_H$) :** Pour deux pHash $h1$ et $h2$, on veut $d_H(h1, h2) \geq 10$.
- **SSIM :** $$SSIM(x, y) = \frac{(2\mu_x\mu_y + c_1)(2\sigma_{xy} + c_2)}{(\mu_x^2 + \mu_y^2 + c_1)(\sigma_x^2 + \sigma_y^2 + c_2)}$$
  Cible : $SSIM \geq 0.995$.

## 2. Commandes FFmpeg Recommandées
Pour le pipeline multi-couches, utiliser un `filter_complex` pour éviter les pertes de génération :

```bash
# Exemple de logique de filtre :
# - noise: ajout de grain invisible
# - eq: ajustement gamma de 0.01
# - crop: retrait de 2 pixels aléatoires
# - setsar: forcer le ratio pour éviter les étirements
ffmpeg -i input.mp4 -vf "noise=alls=1:allf=t+u, eq=gamma=1.01:contrast=1.001, crop=iw-2:ih-2:1:1, setsar=1" -c:v libx264 -crf 18 -preset veryfast output.mp4