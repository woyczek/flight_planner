(() => {
  'use strict';
  // Flotte DEFA Virtual (type OACI, immatriculation, indicatif) : base commune des appareils
  // connus, partagée par les CR HEMS / FIRE (aircraft_directory.js) et le Mission Report Core.
  window.DEFA_FLEET = [
    ['H160','F-HMRE','BELLIGOUY'],['CL2T','F-ZBEZ','PELICAN41'],['CL2T','F-ZBEU','PELICAN42'],['CL2T','F-ZBFQ','PELICAN43'],['CL2T','F-ZBME','PELICAN44'],['CL2T','F-ZBMF','PELICAN45'],['CL2T','F-ZBMG','PELICAN48'],
    ['DH8D','F-ZBMC','MILAN73'],['DH8D','F-ZBMD','MILAN74'],['DH8D','F-ZBMH','MILAN75'],['DH8D','F-ZBMI','MILAN76'],['DH8D','F-ZBMJ','MILAN77'],['DH8D','F-ZBMK','MILAN78'],['DH8D','F-ZBML','MILAN79'],['DH8D','F-ZBBM','MILAN80'],
    ['EC45','F-ZBPD','DRAGON76'],['EC45','F-ZBPD','DRAGON30'],['EC45','F-ZBQK','DRAGON2B'],['EC45','F-ZBPM','DRAGON13'],['EC45','F-ZBPR','DRAGON34'],['EC45','F-ZBQB','DRAGON66'],['EC45','F-ZBQL','DRAGON17'],['EC45','F-ZBPE','DRAGON20'],['EC45','F-ZBPQ','DRAGON56'],['EC45','F-ZBPH','DRAGON33'],['EC45','F-ZBQM','DRAGON64'],
    ['H145','F-ZBPO','DRAGON74-1'],['H145','F-ZBCO','DRAGON74-2'],['H145','F-ZBQU','DRAGON06'],['H145','F-ZBPS','DRAGON75'],['H145','F-ZBPN','DRAGON67'],
    ['EC35','F-HDIJ','SAMU21'],['EC35','F-HCHT','SAMU24'],['EC35','F-HSUI','SAMU29'],['EC35','F-HORL','TONERRE29'],['EC35','F-HGOA','SAMU33'],['EC35','F-HGTR','SAMU34'],['EC35','F-HSUB','SAMU49'],['EC35','F-HNLO','SAMU54'],['EC35','F-GLOR','SAMU94'],['EC35','F-OHSG','SAMU974'],
    ['EC45','F-HSOF','SAMU35'],['EC45','F-HMBH','SAMU68'],['EC45','F-HSUG','SAMU45'],['EC45','F-HSUE','SAMU44'],['H145','F-HNOR','SAMU59'],['H145','F-HLCL','SAMU66'],['H145','F-HLCE','SAMU12'],['H145','F-HCHU','SAMU80'],['H145','F-HSIK','SAMU06'],['H145','F-HSMU','SAMU69']
  ].map(([type, registration, callsign]) => ({ type, registration, callsign }));
})();
