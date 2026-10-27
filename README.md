# beschikbaarheidsportaal
beschikbaarheidsportaal

> **Let op:** deze website wordt niet meer onderhouden en is verhuisd naar [mwwvakdocent.nl](https://mwwvakdocent.nl).
> Bij het openen toont `js/deprecation-popup.js` een geforceerde pop-up met een verwijzing naar de nieuwe website.
> Beheerders kunnen de pop-up sluiten met de beheerderscode; dit wordt onthouden voor de huidige browsersessie (sessionStorage).

## Opzettelijke vertraging

Om gebruikers naar de nieuwe website te sturen is deze oude site bewust trager gemaakt:

- `apiCall()` in `js/api.js` wacht vóór elk verzoek: 4 seconden basis, +2 seconden per week sinds 2026-10-27, maximaal 30 seconden, plus willekeurig 0–1,5 seconde.
- `sw.js` gebruikt geen lokale opslag meer; alles wordt met `cache: 'no-store'` van het netwerk geladen (`CACHE_NAME` is `mediawegwijs-v6.0-deprecated`).

De functionaliteit (inloggen, beschikbaarheid opslaan, beheerdersdashboard) blijft werken, alleen trager.
