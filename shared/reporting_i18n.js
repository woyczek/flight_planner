(() => {
  'use strict';
  // Traductions des nouveaux éléments d'UI introduits par le framework de reporting
  // partagé (shared/time_period.js, shared/mission_table.js) et par les sections
  // ajoutées aux pages HEMS/GAAR/général. S'enregistre auprès du même mécanisme de
  // traduction live que gaar_i18n.js/hems_i18n.js (shared/content_i18n.js).
  if (!window.RepositoryContentI18n) return;
  const rows = [
    ['Période', 'Period', 'Zeitraum', 'Periodo'],
    ["Toutes les dates", 'All dates', 'Alle Daten', 'Todas las fechas'],
    ["Aujourd'hui", 'Today', 'Heute', 'Hoy'],
    ['7 derniers jours', 'Last 7 days', 'Letzte 7 Tage', 'Últimos 7 días'],
    ['30 derniers jours', 'Last 30 days', 'Letzte 30 Tage', 'Últimos 30 días'],
    ['Mois en cours', 'Current month', 'Aktueller Monat', 'Mes en curso'],
    ['Année en cours', 'Current year', 'Aktuelles Jahr', 'Año en curso'],
    ['Période personnalisée', 'Custom period', 'Benutzerdefinierter Zeitraum', 'Periodo personalizado'],
    ['Période analysée', 'Period analysed', 'Analysierter Zeitraum', 'Periodo analizado'],
    ['Cette période est partagée avec les reportings HEMS et GAAR.', 'This period is shared with the HEMS and GAAR reports.', 'Dieser Zeitraum wird mit den HEMS- und GAAR-Berichten geteilt.', 'Este periodo se comparte con los informes HEMS y GAAR.'],
    ['La période sélectionnée ci-dessus est partagée avec le reporting général et GAAR.', 'The period selected above is shared with the general and GAAR reporting.', 'Der oben gewählte Zeitraum wird mit dem allgemeinen und dem GAAR-Reporting geteilt.', 'El periodo seleccionado arriba se comparte con el reporte general y GAAR.'],
    ['La période sélectionnée ci-dessus est partagée avec le reporting général et HEMS.', 'The period selected above is shared with the general and HEMS reporting.', 'Der oben gewählte Zeitraum wird mit dem allgemeinen und dem HEMS-Reporting geteilt.', 'El periodo seleccionado arriba se comparte con el reporte general y HEMS.'],
    ['Missions (tri, édition, suppression)', 'Missions (sort, edit, delete)', 'Einsätze (Sortieren, Bearbeiten, Löschen)', 'Misiones (ordenar, editar, eliminar)'],
    ['Missions par immatriculation', 'Missions by registration', 'Einsätze nach Kennzeichen', 'Misiones por matrícula'],
    ['Actions', 'Actions', 'Aktionen', 'Acciones'],
    ['Modifier', 'Edit', 'Bearbeiten', 'Editar'],
    ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
    ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
    ['Supprimer', 'Delete', 'Löschen', 'Eliminar'],
    ['Aucune mission pour la période sélectionnée.', 'No missions for the selected period.', 'Keine Einsätze im gewählten Zeitraum.', 'Sin misiones en el periodo seleccionado.'],
    ['Exporter le registre modifié', 'Export updated ledger', 'Geändertes Register exportieren', 'Exportar registro actualizado'],
    ['Recharger le fichier', 'Reload file', 'Datei neu laden', 'Recargar archivo'],
    ['Nouveau compte rendu', 'New report', 'Neuer Bericht', 'Nuevo informe'],
    ['Voir les comptes rendus', 'View reports', 'Berichte ansehen', 'Ver informes'],
    ['Trace', 'Track', 'Spur', 'Traza'],
    ['ID IVAO', 'IVAO ID', 'IVAO-ID', 'ID IVAO'],
    ['ID VATSIM', 'VATSIM ID', 'VATSIM-ID', 'ID VATSIM'],
    ['Préférences', 'Preferences', 'Einstellungen', 'Preferencias'],
    ["Utilisés par défaut pour construire les liens de trace et pré-remplir les comptes rendus.", 'Used by default to build track links and pre-fill reports.', 'Werden standardmäßig zum Erstellen der Spur-Links und zum Vorausfüllen der Berichte verwendet.', 'Se usan por defecto para construir los enlaces de traza y precompletar los informes.'],
    ["Des données saisies n'ont pas été enregistrées. Quitter quand même ?", 'Unsaved data will be lost. Leave anyway?', 'Nicht gespeicherte Eingaben gehen verloren. Trotzdem verlassen?', 'Hay datos sin guardar que se perderán. ¿Salir de todos modos?']
  ];
  window.RepositoryContentI18n(rows);
})();
