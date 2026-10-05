// Porte du premier affichage (config/repository_tree, script d'en-tête) : module chargé avec blocking="render".
// Un module ne s'exécute qu'une fois la page entièrement analysée (après les scripts de fin de page, qui construisent
// barre latérale, onglets et contenu) ; tant qu'il ne s'est pas exécuté, le navigateur n'affiche pas la page et garde
// la précédente à l'écran (changement d'onglet ou de page sans page à moitié construite). Rien d'autre à faire ici.
export {};
