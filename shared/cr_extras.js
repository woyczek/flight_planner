(() => {
  'use strict';
  // Extension légère pour les générateurs de compte rendu (HEMS et GAAR) :
  // - avertit si la page est quittée avec des données saisies non enregistrées ;
  // - relie les champs ID IVAO / ID VATSIM (s'ils existent sur la page) aux
  //   préférences partagées (mission_reporting_config.js), pour qu'ils soient
  //   mémorisés et réutilisés d'une mission à l'autre ;
  // - ajoute un bouton de retour rapide vers la page de reporting correspondante
  //   dans le menu du framework (RepositoryNav), si celui-ci est disponible.
  // Ne rien casser si un de ces éléments est absent : chaque bloc est autonome.

  const $ = id => document.getElementById(id);
  const form = document.querySelector('#missionForm') || document.querySelector('form');

  // --- Garde anti-perte : dès qu'un champ du formulaire change, la page est
  // considérée "sale" jusqu'à un archivage/export explicite.
  if (form) {
    let dirty = false;
    form.addEventListener('input', () => {
      dirty = true;
    });
    form.addEventListener('change', () => {
      dirty = true;
    });
    ['archiveBtn', 'downloadCsvBtn', 'saveJsonBtn', 'renderBtn'].forEach(id => {
      $(id)?.addEventListener('click', () => {
        dirty = false;
      });
    });
    if (window.AppFramework?.guardUnsavedChanges) {
      window.AppFramework.guardUnsavedChanges(() => dirty, {
        linkSelector: 'a[href]:not([target="_blank"])'
      });
    } else {
      window.addEventListener('beforeunload', event => {
        if (dirty) {
          event.preventDefault();
          event.returnValue = '';
        }
      });
    }
  }

  // --- Préférences IVAO / VATSIM : si les champs existent (name="ivaoId" /
  // name="vatsimId"), on les relie au même mécanisme de préférences partagées
  // que le nom de registre CSV, pour qu'ils soient pré-remplis automatiquement.
  window.addEventListener('DOMContentLoaded', () => {
    ['ivaoId', 'vatsimId'].forEach(name => {
      const field = form?.querySelector(`[name="${name}"]`);
      if (!field) return;
      field.dataset.missionConfig = name;
    });
    // mission_reporting_config.js ne relie que les éléments déjà présents au
    // moment de son propre DOMContentLoaded ; comme ce script peut se charger
    // après, on refait manuellement la lecture/écriture ici.
    const config = window.MissionReportingConfig?.read?.() || {};
    ['ivaoId', 'vatsimId'].forEach(name => {
      const field = form?.querySelector(`[name="${name}"]`);
      if (!field) return;
      if (config[name] && !field.value) field.value = config[name];
      field.addEventListener('input', () => {
        if (field.value) window.MissionReportingConfig?.write?.({
          [name]: field.value
        });
      });
      field.addEventListener('change', () => {
        if (field.value) window.MissionReportingConfig?.write?.({
          [name]: field.value
        });
      });
    });
  });

  // --- Bouton retour rapide vers le reporting correspondant.
  const isGaar = location.pathname.includes('/FIRE/');
  const target = isGaar ? 'fire_reporting.html' : 'hems_medevac_reporting.html';
  const label = isGaar ? 'Voir le reporting FIRE / GAAR' : 'Voir le reporting HEMS';
  window.RepositoryNav?.addAction?.(label, () => {
    location.href = target;
  });
})();
