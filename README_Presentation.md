# FireWatch

### Savoir enfin si la forêt brûle vraiment plus qu’avant

*NASA Space Apps Challenge 2026 · Défi « Harmonization of MODIS and VIIRS Hot Spots »*

---

## Le contexte

Chaque année, l’Afrique centrale brûle.

Des feux de brousse, des champs que l’on prépare avant les pluies, et parfois des pans entiers de forêt. Cela se passe dans le **bassin du Congo**, la deuxième plus grande forêt tropicale du monde après l’Amazonie. C’est un poumon pour la planète, et un lieu de vie pour des millions de personnes.

Depuis plus de vingt ans, la NASA surveille ces feux depuis l’espace, **tous les jours**. Ses satellites repèrent chaque point de chaleur anormal à la surface de la Terre. Ces données sont publiques et gratuites.

Nous avons donc vingt-cinq ans d’observations entre les mains. De quoi répondre à une question essentielle :

> **Y a-t-il plus de feux aujourd’hui qu’il y a vingt ans ?**

---

## La problématique

La réponse semble facile : on compte les feux de 2005, on compte ceux de 2025, et on compare.

**Mais ce calcul est faux.**

En 2002, deux satellites observaient les feux. Aujourd’hui, il y en a cinq. Et les nouveaux voient beaucoup mieux : là où l’ancien distinguait un carré d’un kilomètre de côté, le nouveau distingue un carré de 375 mètres. Il repère donc des petits feux que l’ancien ne voyait tout simplement pas.

| Année | Satellites qui observent | Finesse de la vue |
|---|---|---|
| 2002 | 2 | carrés d’1 km |
| 2012 | 3 | jusqu’à 375 m |
| 2018 | 4 | jusqu’à 375 m |
| 2024 | 5 | jusqu’à 375 m |

Le résultat est trompeur : **sur les courbes, les feux semblent exploser. Mais ce n’est pas forcément la forêt qui brûle davantage. C’est notre regard qui est devenu plus précis.**

C’est comme compter les étoiles à l’œil nu, puis au télescope, et conclure qu’il y a plus d’étoiles dans le ciel.

Ce biais a des conséquences bien réelles :

- **Une fausse alerte** fait croire à une catastrophe qui n’en est pas une, et détourne les moyens.
- **Une vraie hausse** peut passer inaperçue, noyée dans le bruit des nouveaux satellites.
- **Les décisions** de protection des forêts reposent sur des chiffres impossibles à comparer.

Aujourd’hui, personne ne peut lire simplement ces données pour savoir si une saison de feux est normale ou inquiétante.

---

## La solution : FireWatch

**FireWatch remet tous les satellites sur la même règle, puis rend le résultat lisible par tout le monde.**

### 1. Une seule référence

Nous prenons comme étalon un satellite unique, **Aqua**. Il observe la même région, à la même heure, avec le même appareil, sans interruption depuis 2002. C’est notre fil rouge : il permet de comparer 2002 et 2026 honnêtement.

### 2. Une correction mesurée, pas devinée

Pour chaque satellite récent, nous calculons combien de feux il voit en plus qu’Aqua, **région par région et mois par mois**, sur les périodes où ils observent ensemble. Puis nous corrigeons. Un feu vu aujourd’hui compte comme il aurait compté en 2002.

Les chiffres bruts restent toujours visibles. La correction est une option affichée clairement : rien n’est caché.

### 3. Une réponse claire : normal ou pas normal

Chaque mois est comparé à tous les mêmes mois des années passées. Quand un mois dépasse nettement l’habitude, FireWatch le signale tout de suite : **« ce mois sort de l’ordinaire »**.

### 4. Une lecture à la portée de tous

Pas besoin d’être scientifique :

- **Un globe** montre où ça brûle. Un clic sur un feu ouvre une carte satellite de l’endroit exact, avec le nom de la forêt, de la province et de la ville la plus proche.
- **Un calendrier** affiche vingt-cinq ans d’un coup d’œil : une case par mois, plus la case est claire, plus il y a eu de feux.
- **Des mots simples** remplacent le jargon : « grand feu » plutôt que « 52 mégawatts », « feu presque certain » plutôt que « confiance élevée ».
- **Un assistant** répond en français à des questions comme « Est-ce qu’il y a eu plus de feux au Gabon cette année ? ».

---

## Ce que cela change pour la société

| Pour… | FireWatch permet de… |
|---|---|
| **Les gardes forestiers** | voir en un clic si un feu touche leur parc |
| **Les autorités et les ONG** | préparer les équipes avant la saison, qui revient chaque année aux mêmes mois |
| **Les journalistes** | vérifier si une « année record » l’est vraiment |
| **Les chercheurs** | disposer d’une série propre, comparable de 2002 à aujourd’hui |
| **Les citoyens** | comprendre ce qui se passe autour de chez eux, sans formation |

Derrière chaque chiffre, il y a une forêt à protéger, un air à respirer et des communautés à préserver.

---

## En résumé

> **Le problème :** plus de satellites, une meilleure vue, et donc des chiffres qui gonflent sans que l’on sache si les feux augmentent vraiment.
>
> **La solution :** une seule règle de mesure pour vingt-cinq ans d’observations, et une interface que tout le monde peut comprendre.
>
> **L’impact :** distinguer enfin une vraie alerte d’une illusion, pour agir au bon endroit et au bon moment.

**Les satellites nous donnent des yeux sur toute la planète. FireWatch leur apprend à parler la même langue, et à la parler simplement.**

---

*FireWatch · NASA Space Apps Challenge 2026*
