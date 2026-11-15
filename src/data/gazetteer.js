import { countryAtPoint } from './countries'

/** Localités et aires naturelles réelles d'Afrique centrale.
 *  La province du feu vient d'OpenStreetMap (la zone qui contient le point).
 *  Ici : la ville connue la plus proche, et la forêt ou l'aire protégée du secteur.
 *  Chaque ligne : nom, latitude, longitude, puis province et pays — ou rayon (km) pour une aire.
 */

const PAYS_BOX = [
  ['Gabon', -3.95, 2.3, 8.7, 14.5],
  ['Cameroun', 1.6, 13, 8.4, 16.2],
  ['Congo', -5.1, 3.7, 11.2, 18.6],
  ['République centrafricaine', 2.2, 11.0, 14.4, 27.5],
  ['République démocratique du Congo', -13.5, 5.4, 12.2, 31.3],
]

// nom, lat, lng, province, pays
const VILLES = [
  ['Libreville', 0.39, 9.45, 'Estuaire', 'Gabon'],
  ['Owendo', 0.29, 9.50, 'Estuaire', 'Gabon'],
  ['Ntoum', 0.39, 9.76, 'Estuaire', 'Gabon'],
  ['Kango', -0.18, 10.12, 'Estuaire', 'Gabon'],
  ['Cocobeach', 1.00, 9.58, 'Estuaire', 'Gabon'],
  ['Port-Gentil', -0.72, 8.78, 'Ogooué-Maritime', 'Gabon'],
  ['Omboué', -1.57, 9.26, 'Ogooué-Maritime', 'Gabon'],
  ['Gamba', -2.73, 10.01, 'Ogooué-Maritime', 'Gabon'],
  ['Lambaréné', -0.70, 10.23, 'Moyen-Ogooué', 'Gabon'],
  ['Ndjolé', -0.18, 10.76, 'Moyen-Ogooué', 'Gabon'],
  ['Bifoun', -0.33, 10.38, 'Moyen-Ogooué', 'Gabon'],
  ['Mouila', -1.87, 11.06, 'Ngounié', 'Gabon'],
  ['Fougamou', -1.22, 10.59, 'Ngounié', 'Gabon'],
  ['Ndendé', -2.40, 11.36, 'Ngounié', 'Gabon'],
  ['Tchibanga', -2.85, 11.03, 'Nyanga', 'Gabon'],
  ['Mayumba', -3.42, 10.65, 'Nyanga', 'Gabon'],
  ['Booué', -0.10, 11.95, 'Ogooué-Ivindo', 'Gabon'],
  ['Makokou', 0.57, 12.86, 'Ogooué-Ivindo', 'Gabon'],
  ['Mékambo', 1.02, 13.93, 'Ogooué-Ivindo', 'Gabon'],
  ['Koulamoutou', -1.14, 12.46, 'Ogooué-Lolo', 'Gabon'],
  ['Lastoursville', -0.82, 12.71, 'Ogooué-Lolo', 'Gabon'],
  ['Franceville', -1.63, 13.58, 'Haut-Ogooué', 'Gabon'],
  ['Moanda', -1.57, 13.20, 'Haut-Ogooué', 'Gabon'],
  ['Bakoumba', -1.78, 13.03, 'Haut-Ogooué', 'Gabon'],
  ['Okondja', -0.65, 13.68, 'Haut-Ogooué', 'Gabon'],
  ['Lékoni', -1.58, 14.26, 'Haut-Ogooué', 'Gabon'],
  ['Oyem', 1.62, 11.58, 'Woleu-Ntem', 'Gabon'],
  ['Bitam', 2.08, 11.48, 'Woleu-Ntem', 'Gabon'],
  ['Minvoul', 2.15, 12.13, 'Woleu-Ntem', 'Gabon'],
  ['Mitzic', 0.78, 11.57, 'Woleu-Ntem', 'Gabon'],
  ['Médouneu', 0.95, 10.78, 'Woleu-Ntem', 'Gabon'],

  ['Yaoundé', 3.87, 11.52, 'Centre', 'Cameroun'],
  ['Mbalmayo', 3.52, 11.50, 'Centre', 'Cameroun'],
  ['Akonolinga', 3.77, 12.25, 'Centre', 'Cameroun'],
  ['Bafia', 4.75, 11.23, 'Centre', 'Cameroun'],
  ['Nanga-Eboko', 4.68, 12.37, 'Centre', 'Cameroun'],
  ['Douala', 4.05, 9.77, 'Littoral', 'Cameroun'],
  ['Edéa', 3.80, 10.13, 'Littoral', 'Cameroun'],
  ['Nkongsamba', 4.95, 9.94, 'Littoral', 'Cameroun'],
  ['Kribi', 2.94, 9.91, 'Sud', 'Cameroun'],
  ['Ebolowa', 2.92, 11.15, 'Sud', 'Cameroun'],
  ['Sangmélima', 2.93, 11.98, 'Sud', 'Cameroun'],
  ['Djoum', 2.67, 12.67, 'Sud', 'Cameroun'],
  ['Ambam', 2.38, 11.28, 'Sud', 'Cameroun'],
  ['Bertoua', 4.58, 13.68, 'Est', 'Cameroun'],
  ['Batouri', 4.43, 14.36, 'Est', 'Cameroun'],
  ['Abong-Mbang', 3.98, 13.18, 'Est', 'Cameroun'],
  ['Yokadouma', 3.52, 15.05, 'Est', 'Cameroun'],
  ['Lomié', 3.15, 13.62, 'Est', 'Cameroun'],
  ['Moloundou', 2.05, 15.22, 'Est', 'Cameroun'],
  ['Garoua-Boulaï', 5.89, 14.55, 'Est', 'Cameroun'],
  ['Bétaré-Oya', 5.60, 14.08, 'Est', 'Cameroun'],
  ['Bafoussam', 5.48, 10.42, 'Ouest', 'Cameroun'],
  ['Dschang', 5.45, 10.07, 'Ouest', 'Cameroun'],
  ['Foumban', 5.73, 10.90, 'Ouest', 'Cameroun'],
  ['Bamenda', 5.96, 10.15, 'Nord-Ouest', 'Cameroun'],
  ['Kumbo', 6.20, 10.67, 'Nord-Ouest', 'Cameroun'],
  ['Buea', 4.16, 9.23, 'Sud-Ouest', 'Cameroun'],
  ['Limbé', 4.02, 9.21, 'Sud-Ouest', 'Cameroun'],
  ['Kumba', 4.64, 9.45, 'Sud-Ouest', 'Cameroun'],
  ['Mamfé', 5.77, 9.31, 'Sud-Ouest', 'Cameroun'],
  ['Mundemba', 4.97, 8.87, 'Sud-Ouest', 'Cameroun'],
  ['Ngaoundéré', 7.33, 13.58, 'Adamaoua', 'Cameroun'],
  ['Meiganga', 6.52, 14.29, 'Adamaoua', 'Cameroun'],
  ['Tibati', 6.47, 12.63, 'Adamaoua', 'Cameroun'],
  ['Banyo', 6.75, 11.82, 'Adamaoua', 'Cameroun'],
  ['Tignère', 7.37, 12.65, 'Adamaoua', 'Cameroun'],
  ['Garoua', 9.30, 13.39, 'Nord', 'Cameroun'],
  ['Guider', 9.93, 13.95, 'Nord', 'Cameroun'],
  ['Poli', 8.48, 13.25, 'Nord', 'Cameroun'],
  ['Tcholliré', 8.40, 14.17, 'Nord', 'Cameroun'],
  ['Maroua', 10.59, 14.32, 'Extrême-Nord', 'Cameroun'],
  ['Kousséri', 12.08, 15.03, 'Extrême-Nord', 'Cameroun'],
  ['Mora', 11.05, 14.14, 'Extrême-Nord', 'Cameroun'],
  ['Mokolo', 10.74, 13.80, 'Extrême-Nord', 'Cameroun'],
  ['Yagoua', 10.34, 15.23, 'Extrême-Nord', 'Cameroun'],
  ['Kaélé', 10.11, 14.45, 'Extrême-Nord', 'Cameroun'],

  ['Brazzaville', -4.27, 15.28, 'Brazzaville', 'Congo'],
  ['Pointe-Noire', -4.78, 11.86, 'Pointe-Noire', 'Congo'],
  ['Dolisie', -4.20, 12.67, 'Niari', 'Congo'],
  ['Mossendjo', -2.95, 12.70, 'Niari', 'Congo'],
  ['Nkayi', -4.18, 13.28, 'Bouenza', 'Congo'],
  ['Madingou', -4.15, 13.55, 'Bouenza', 'Congo'],
  ['Sibiti', -3.68, 13.35, 'Lékoumou', 'Congo'],
  ['Zanaga', -2.84, 13.82, 'Lékoumou', 'Congo'],
  ['Kinkala', -4.36, 14.76, 'Pool', 'Congo'],
  ['Djambala', -2.54, 14.75, 'Plateaux', 'Congo'],
  ['Gamboma', -1.88, 15.86, 'Plateaux', 'Congo'],
  ['Owando', -0.48, 15.90, 'Cuvette', 'Congo'],
  ['Makoua', 0.01, 15.64, 'Cuvette', 'Congo'],
  ['Boundji', -1.03, 15.36, 'Cuvette', 'Congo'],
  ['Ewo', -0.87, 14.82, 'Cuvette-Ouest', 'Congo'],
  ['Kellé', -0.06, 14.51, 'Cuvette-Ouest', 'Congo'],
  ['Etoumbi', 0.62, 14.82, 'Cuvette-Ouest', 'Congo'],
  ['Ouesso', 1.61, 16.05, 'Sangha', 'Congo'],
  ['Pokola', 1.41, 16.32, 'Sangha', 'Congo'],
  ['Sembé', 1.65, 14.58, 'Sangha', 'Congo'],
  ['Souanké', 2.05, 14.13, 'Sangha', 'Congo'],
  ['Impfondo', 1.62, 18.06, 'Likouala', 'Congo'],
  ['Dongou', 2.05, 18.05, 'Likouala', 'Congo'],
  ['Épéna', 1.35, 17.47, 'Likouala', 'Congo'],
  ['Bétou', 3.05, 18.50, 'Likouala', 'Congo'],

  ['Bangui', 4.36, 18.56, 'Bangui', 'République centrafricaine'],
  ['Bimbo', 4.26, 18.42, 'Ombella-M\'Poko', 'République centrafricaine'],
  ['Boali', 4.80, 18.12, 'Ombella-M\'Poko', 'République centrafricaine'],
  ['Damara', 4.96, 18.70, 'Ombella-M\'Poko', 'République centrafricaine'],
  ['Mbaïki', 3.88, 18.00, 'Lobaye', 'République centrafricaine'],
  ['Boda', 4.32, 17.47, 'Lobaye', 'République centrafricaine'],
  ['Mongoumba', 3.64, 18.59, 'Lobaye', 'République centrafricaine'],
  ['Berbérati', 4.26, 15.79, 'Mambéré-Kadéï', 'République centrafricaine'],
  ['Carnot', 4.94, 15.87, 'Mambéré-Kadéï', 'République centrafricaine'],
  ['Gamboula', 4.12, 15.14, 'Mambéré-Kadéï', 'République centrafricaine'],
  ['Nola', 3.53, 16.07, 'Sangha-Mbaéré', 'République centrafricaine'],
  ['Bayanga', 2.92, 16.26, 'Sangha-Mbaéré', 'République centrafricaine'],
  ['Bouar', 5.93, 15.60, 'Nana-Mambéré', 'République centrafricaine'],
  ['Bozoum', 6.32, 16.38, 'Ouham-Pendé', 'République centrafricaine'],
  ['Paoua', 7.24, 16.44, 'Ouham-Pendé', 'République centrafricaine'],
  ['Bossangoa', 6.49, 17.46, 'Ouham', 'République centrafricaine'],
  ['Batangafo', 7.30, 18.30, 'Ouham', 'République centrafricaine'],
  ['Bouca', 6.51, 18.28, 'Ouham', 'République centrafricaine'],
  ['Sibut', 5.74, 19.08, 'Kémo', 'République centrafricaine'],
  ['Kaga-Bandoro', 6.99, 19.19, 'Nana-Gribizi', 'République centrafricaine'],
  ['Bambari', 5.76, 20.68, 'Ouaka', 'République centrafricaine'],
  ['Grimari', 5.73, 19.91, 'Ouaka', 'République centrafricaine'],
  ['Ippy', 6.27, 21.22, 'Ouaka', 'République centrafricaine'],
  ['Kouango', 4.97, 19.98, 'Ouaka', 'République centrafricaine'],
  ['Mobaye', 4.32, 21.18, 'Basse-Kotto', 'République centrafricaine'],
  ['Alindao', 5.03, 21.21, 'Basse-Kotto', 'République centrafricaine'],
  ['Kembé', 4.60, 21.89, 'Basse-Kotto', 'République centrafricaine'],
  ['Bria', 6.54, 21.99, 'Haute-Kotto', 'République centrafricaine'],
  ['Yalinga', 6.51, 23.25, 'Haute-Kotto', 'République centrafricaine'],
  ['Ouadda', 8.07, 22.40, 'Haute-Kotto', 'République centrafricaine'],
  ['Bangassou', 4.74, 22.82, 'Mbomou', 'République centrafricaine'],
  ['Bakouma', 5.70, 22.79, 'Mbomou', 'République centrafricaine'],
  ['Gambo', 4.65, 22.26, 'Mbomou', 'République centrafricaine'],
  ['Rafaï', 4.97, 23.92, 'Mbomou', 'République centrafricaine'],
  ['Obo', 5.40, 26.49, 'Haut-Mbomou', 'République centrafricaine'],
  ['Zémio', 5.03, 25.14, 'Haut-Mbomou', 'République centrafricaine'],
  ['Djéma', 6.05, 25.32, 'Haut-Mbomou', 'République centrafricaine'],
  ['Birao', 10.28, 22.78, 'Vakaga', 'République centrafricaine'],
  ['Ouanda Djallé', 8.90, 22.80, 'Vakaga', 'République centrafricaine'],
  ['Ndélé', 8.41, 20.65, 'Bamingui-Bangoran', 'République centrafricaine'],

  ['Kinshasa', -4.32, 15.31, 'Kinshasa', 'République démocratique du Congo'],
  ['Matadi', -5.82, 13.45, 'Kongo-Central', 'République démocratique du Congo'],
  ['Boma', -5.85, 13.05, 'Kongo-Central', 'République démocratique du Congo'],
  ['Mbanza-Ngungu', -5.25, 14.86, 'Kongo-Central', 'République démocratique du Congo'],
  ['Kenge', -4.83, 17.04, 'Kwango', 'République démocratique du Congo'],
  ['Popokabaka', -5.70, 16.58, 'Kwango', 'République démocratique du Congo'],
  ['Kahemba', -7.32, 19.00, 'Kwango', 'République démocratique du Congo'],
  ['Kikwit', -5.04, 18.82, 'Kwilu', 'République démocratique du Congo'],
  ['Bandundu', -3.31, 17.38, 'Kwilu', 'République démocratique du Congo'],
  ['Idiofa', -4.97, 19.59, 'Kwilu', 'République démocratique du Congo'],
  ['Inongo', -1.95, 18.28, 'Maï-Ndombe', 'République démocratique du Congo'],
  ['Kutu', -2.73, 18.14, 'Maï-Ndombe', 'République démocratique du Congo'],
  ['Oshwe', -3.40, 19.50, 'Maï-Ndombe', 'République démocratique du Congo'],
  ['Kiri', -1.45, 19.00, 'Maï-Ndombe', 'République démocratique du Congo'],
  ['Bolobo', -2.16, 16.23, 'Maï-Ndombe', 'République démocratique du Congo'],
  ['Mushie', -3.02, 16.92, 'Maï-Ndombe', 'République démocratique du Congo'],
  ['Mbandaka', 0.05, 18.26, 'Équateur', 'République démocratique du Congo'],
  ['Lukolela', -1.06, 17.18, 'Équateur', 'République démocratique du Congo'],
  ['Basankusu', 1.22, 19.80, 'Équateur', 'République démocratique du Congo'],
  ['Ingende', -0.25, 18.93, 'Équateur', 'République démocratique du Congo'],
  ['Gemena', 3.26, 19.77, 'Sud-Ubangi', 'République démocratique du Congo'],
  ['Zongo', 4.35, 18.59, 'Sud-Ubangi', 'République démocratique du Congo'],
  ['Libenge', 3.65, 18.63, 'Sud-Ubangi', 'République démocratique du Congo'],
  ['Gbadolite', 4.28, 21.00, 'Nord-Ubangi', 'République démocratique du Congo'],
  ['Bosobolo', 4.20, 19.88, 'Nord-Ubangi', 'République démocratique du Congo'],
  ['Lisala', 2.15, 21.51, 'Mongala', 'République démocratique du Congo'],
  ['Bumba', 2.19, 22.47, 'Mongala', 'République démocratique du Congo'],
  ['Businga', 3.34, 20.87, 'Mongala', 'République démocratique du Congo'],
  ['Buta', 2.80, 24.74, 'Bas-Uélé', 'République démocratique du Congo'],
  ['Aketi', 2.74, 23.78, 'Bas-Uélé', 'République démocratique du Congo'],
  ['Bondo', 3.81, 23.67, 'Bas-Uélé', 'République démocratique du Congo'],
  ['Ango', 4.03, 25.87, 'Bas-Uélé', 'République démocratique du Congo'],
  ['Isiro', 2.77, 27.62, 'Haut-Uélé', 'République démocratique du Congo'],
  ['Watsa', 3.04, 29.53, 'Haut-Uélé', 'République démocratique du Congo'],
  ['Dungu', 3.62, 28.57, 'Haut-Uélé', 'République démocratique du Congo'],
  ['Niangara', 3.70, 27.87, 'Haut-Uélé', 'République démocratique du Congo'],
  ['Faradje', 3.73, 29.72, 'Haut-Uélé', 'République démocratique du Congo'],
  ['Wamba', 2.14, 27.99, 'Haut-Uélé', 'République démocratique du Congo'],
  ['Bunia', 1.56, 30.25, 'Ituri', 'République démocratique du Congo'],
  ['Mambasa', 1.35, 29.05, 'Ituri', 'République démocratique du Congo'],
  ['Aru', 2.87, 30.83, 'Ituri', 'République démocratique du Congo'],
  ['Djugu', 1.92, 30.50, 'Ituri', 'République démocratique du Congo'],
  ['Kisangani', 0.51, 25.19, 'Tshopo', 'République démocratique du Congo'],
  ['Yangambi', 0.77, 24.44, 'Tshopo', 'République démocratique du Congo'],
  ['Isangi', 0.78, 24.15, 'Tshopo', 'République démocratique du Congo'],
  ['Basoko', 1.23, 23.60, 'Tshopo', 'République démocratique du Congo'],
  ['Opala', -0.60, 24.35, 'Tshopo', 'République démocratique du Congo'],
  ['Ubundu', -0.35, 25.45, 'Tshopo', 'République démocratique du Congo'],
  ['Boende', -0.28, 20.88, 'Tshuapa', 'République démocratique du Congo'],
  ['Ikela', -1.18, 23.27, 'Tshuapa', 'République démocratique du Congo'],
  ['Monkoto', -1.74, 20.68, 'Tshuapa', 'République démocratique du Congo'],
  ['Befale', -0.30, 20.45, 'Tshuapa', 'République démocratique du Congo'],
  ['Goma', -1.68, 29.22, 'Nord-Kivu', 'République démocratique du Congo'],
  ['Butembo', 0.14, 29.29, 'Nord-Kivu', 'République démocratique du Congo'],
  ['Beni', 0.49, 29.47, 'Nord-Kivu', 'République démocratique du Congo'],
  ['Lubero', -0.16, 29.24, 'Nord-Kivu', 'République démocratique du Congo'],
  ['Walikale', -1.42, 28.07, 'Nord-Kivu', 'République démocratique du Congo'],
  ['Bukavu', -2.51, 28.86, 'Sud-Kivu', 'République démocratique du Congo'],
  ['Uvira', -3.40, 29.14, 'Sud-Kivu', 'République démocratique du Congo'],
  ['Shabunda', -2.70, 27.33, 'Sud-Kivu', 'République démocratique du Congo'],
  ['Kindu', -2.95, 25.92, 'Maniema', 'République démocratique du Congo'],
  ['Kasongo', -4.45, 26.67, 'Maniema', 'République démocratique du Congo'],
  ['Punia', -1.37, 26.42, 'Maniema', 'République démocratique du Congo'],
  ['Lubutu', -0.73, 26.58, 'Maniema', 'République démocratique du Congo'],
  ['Kabinda', -6.13, 24.48, 'Lomami', 'République démocratique du Congo'],
  ['Mwene-Ditu', -7.00, 23.45, 'Lomami', 'République démocratique du Congo'],
  ['Lodja', -3.52, 23.60, 'Sankuru', 'République démocratique du Congo'],
  ['Lusambo', -4.97, 23.45, 'Sankuru', 'République démocratique du Congo'],
  ['Lomela', -2.30, 23.28, 'Sankuru', 'République démocratique du Congo'],
  ['Kole', -3.45, 22.45, 'Sankuru', 'République démocratique du Congo'],
  ['Luebo', -5.35, 21.42, 'Kasaï', 'République démocratique du Congo'],
  ['Tshikapa', -6.42, 20.80, 'Kasaï', 'République démocratique du Congo'],
  ['Ilebo', -4.33, 20.58, 'Kasaï', 'République démocratique du Congo'],
  ['Mweka', -4.85, 21.57, 'Kasaï', 'République démocratique du Congo'],
  ['Dekese', -3.46, 21.40, 'Kasaï', 'République démocratique du Congo'],
  ['Kananga', -5.90, 22.42, 'Kasaï-Central', 'République démocratique du Congo'],
  ['Dimbelenge', -5.55, 23.13, 'Kasaï-Central', 'République démocratique du Congo'],
  ['Mbuji-Mayi', -6.15, 23.59, 'Kasaï-Oriental', 'République démocratique du Congo'],
  ['Miabi', -6.25, 23.40, 'Kasaï-Oriental', 'République démocratique du Congo'],
  ['Kamina', -8.74, 25.00, 'Haut-Lomami', 'République démocratique du Congo'],
  ['Bukama', -9.20, 25.85, 'Haut-Lomami', 'République démocratique du Congo'],
  ['Malemba-Nkulu', -8.03, 26.70, 'Haut-Lomami', 'République démocratique du Congo'],
  ['Kalemie', -5.95, 29.19, 'Tanganyika', 'République démocratique du Congo'],
  ['Kongolo', -5.38, 27.00, 'Tanganyika', 'République démocratique du Congo'],
  ['Moba', -7.04, 29.77, 'Tanganyika', 'République démocratique du Congo'],
  ['Manono', -7.30, 27.42, 'Tanganyika', 'République démocratique du Congo'],
  ['Kolwezi', -10.71, 25.47, 'Lualaba', 'République démocratique du Congo'],
  ['Dilolo', -10.70, 22.33, 'Lualaba', 'République démocratique du Congo'],
  ['Sandoa', -9.68, 22.87, 'Lualaba', 'République démocratique du Congo'],
  ['Lubumbashi', -11.66, 27.48, 'Haut-Katanga', 'République démocratique du Congo'],
  ['Likasi', -10.98, 26.73, 'Haut-Katanga', 'République démocratique du Congo'],
  ['Kipushi', -11.76, 27.25, 'Haut-Katanga', 'République démocratique du Congo'],
  ['Kasenga', -10.37, 28.63, 'Haut-Katanga', 'République démocratique du Congo'],
]

// nom, lat, lng, rayon km (secteur où le nom reste juste), pays
const FORETS = [
  ['Réserve de Chinko', 6.168, 24.231, 70, 'République centrafricaine'],
  ['Parc national du Manovo-Gounda St Floris', 8.955, 21.483, 55, 'République centrafricaine'],
  ['Réserve spéciale de Dzanga-Sangha', 2.964, 16.367, 40, 'République centrafricaine'],
  ['Parc national de Bamingui-Bangoran', 7.90, 20.20, 50, 'République centrafricaine'],
  ['Forêt de Ngotto', 3.95, 17.20, 30, 'République centrafricaine'],
  ['Réserve de faune du Dja', 3.135, 13.036, 45, 'Cameroun'],
  ['Parc national de Lobéké', 2.304, 15.866, 30, 'Cameroun'],
  ['Parc national de Boumba Bek', 2.683, 14.967, 35, 'Cameroun'],
  ['Parc national de Campo-Ma’an', 2.45, 10.30, 28, 'Cameroun'],
  ['Parc national de Korup', 5.10, 8.90, 22, 'Cameroun'],
  ['Parc national de Waza', 11.30, 14.70, 28, 'Cameroun'],
  ['Parc national de Mbam et Djerem', 5.90, 12.70, 40, 'Cameroun'],
  ['Parc national de la Lopé', -0.064, 11.905, 55, 'Gabon'],
  ['Parc national de l’Ivindo', 0.45, 12.75, 45, 'Gabon'],
  ['Parc national de Minkébé', 1.729, 12.567, 50, 'Gabon'],
  ['Parc national de Loango', -2.167, 9.567, 30, 'Gabon'],
  ['Parc national de Moukalaba-Doudou', -2.547, 10.409, 35, 'Gabon'],
  ['Parc national de Pongara', 0.12, 9.33, 14, 'Gabon'],
  ['Parc national d’Akanda', 0.60, 9.55, 12, 'Gabon'],
  ['Parc national de Mwagna', 0.60, 13.80, 28, 'Gabon'],
  ['Parc national d’Odzala-Kokoua', 0.893, 14.929, 60, 'Congo'],
  ['Parc national de Nouabalé-Ndoki', 2.538, 16.581, 40, 'Congo'],
  ['Parc national de Conkouati-Douli', -4.238, 11.173, 30, 'Congo'],
  ['Réserve de faune de la Léfini', -2.926, 15.155, 40, 'Congo'],
  ['Parc national de la Salonga', -1.750, 21.844, 90, 'République démocratique du Congo'],
  ['Parc national de la Garamba', 4.176, 29.500, 40, 'République démocratique du Congo'],
  ['Parc national des Virunga', -0.347, 29.539, 45, 'République démocratique du Congo'],
  ['Parc national de Kahuzi-Biega', -2.30, 28.75, 30, 'République démocratique du Congo'],
  ['Parc national de la Maiko', -0.422, 27.463, 40, 'République démocratique du Congo'],
  ['Réserve de faune à okapis', 1.721, 28.523, 60, 'République démocratique du Congo'],
  ['Parc national de la Lomami', -1.998, 25.304, 55, 'République démocratique du Congo'],
]

function kmBetween(lat1, lon1, lat2, lon2) {
  const r = 6371
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function fmtKm(km) {
  if (km < 1) return 'moins d’1 km'
  return `${Math.round(km)} km`
}

function countryAt(lat, lng) {
  try {
    const hit = countryAtPoint(lat, lng)
    if (hit?.nom) return hit.nom
  } catch { /* atlas pas encore chargé */ }
  let best = null
  let bestArea = Infinity
  for (const [nom, latMin, latMax, lonMin, lonMax] of PAYS_BOX) {
    if (lat < latMin || lat > latMax || lng < lonMin || lng > lonMax) continue
    const area = (latMax - latMin) * (lonMax - lonMin)
    if (area < bestArea) {
      best = nom
      bestArea = area
    }
  }
  return best
}

function nearestVille(lat, lng) {
  let best = null
  let bestKm = Infinity
  for (const [nom, la, lo, province, pays] of VILLES) {
    const d = kmBetween(lat, lng, la, lo)
    if (d < bestKm) {
      bestKm = d
      best = { nom, province, pays, km: d }
    }
  }
  return best
}

function nearestForet(lat, lng) {
  let best = null
  let bestKm = Infinity
  for (const [nom, la, lo, rayon, pays] of FORETS) {
    const d = kmBetween(lat, lng, la, lo)
    if (d < bestKm) {
      bestKm = d
      best = { nom, pays, rayon, km: d }
    }
  }
  return best
}

export function samePlace(a, b) {
  const x = norm(a)
  const y = norm(b)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isWild(s) {
  return /parc|foret|reserve|okapi|chinko|salonga|sankuru|conservation/i.test(norm(s))
}

function villeText(v) {
  const where = v.province && !samePlace(v.province, v.nom) ? `${v.nom} · ${v.province}` : v.nom
  if (v.km < 12) return `près de ${where}`
  return `${where} · ville la plus proche, ${fmtKm(v.km)}`
}

function foretText(f) {
  if (f.km <= f.rayon) return `${f.nom} · à ${fmtKm(f.km)} du centre`
  return `${f.nom} · la plus proche, ${fmtKm(f.km)}`
}

/** Lecture immédiate, avant la réponse d'OpenStreetMap. */
export function describePlace(lat, lng) {
  const ville = nearestVille(lat, lng)
  const foret = nearestForet(lat, lng)
  const dans = Boolean(foret && foret.km <= foret.rayon)
  const pays = (dans && foret.pays)
    || (ville && ville.km < 40 ? ville.pays : null)
    || countryAt(lat, lng)
    || ville?.pays
    || null
  const titre = dans ? foret.nom : null
  return {
    titre,
    role: dans ? 'Forêt ou aire protégée' : null,
    sous: dans && pays ? pays : null,
    pays,
    ville: ville && ville.km <= 250 && !(titre && samePlace(titre, ville.nom)) ? villeText(ville) : null,
    foret: !dans && foret && foret.km <= 80 ? foretText(foret) : (dans && foret.km >= 25 ? `centre de l’aire à ${fmtKm(foret.km)}` : null),
    source: null,
    _ville: ville,
    _foret: foret,
  }
}

/** Nom court pour une ligne de liste, calculé sans réseau. */
export function nearPlace(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  const foret = nearestForet(lat, lng)
  if (foret && foret.km <= foret.rayon) return foret.nom
  const ville = nearestVille(lat, lng)
  if (!ville) return ''
  if (ville.km < 12) return `près de ${ville.nom}`
  return `à ${fmtKm(ville.km)} de ${ville.nom}`
}

export function stripPlace(place) {
  if (!place) return null
  const { titre, role, sous, pays, ville, foret, source } = place
  return { titre, role, sous, pays, ville, foret, source: source || null }
}
