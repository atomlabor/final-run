module.exports = [
  {
    "type": "heading",
    "defaultValue": "Lauf-Konfiguration"
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Kurzanleitung"
      },
      {
        "type": "text",
        "defaultValue": "1. Öffne Google Maps.\n2. Halte den Finger auf dein Ziel.\n3. Kopiere die Zahlen (Lat, Lon) in die Felder unten.\n4. Klicke auf Speichern."
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Ziel-Einstellungen"
      },
      {
        "type": "input",
        "messageKey": "CONFIG_TARGET_NAME",
        "label": "Name des Ziels",
        "defaultValue": "Zuhause",
        "attributes": {
          "placeholder": "z.B. Büro oder Park"
        }
      },
      {
        "type": "input",
        "messageKey": "CONFIG_TARGET_LAT",
        "label": "Breitengrad (Latitude)",
        "defaultValue": "51.2562",
        "attributes": {
          "type": "number",
          "step": "0.0001"
        }
      },
      {
        "type": "input",
        "messageKey": "CONFIG_TARGET_LON",
        "label": "Längengrad (Longitude)",
        "defaultValue": "7.1508",
        "attributes": {
          "type": "number",
          "step": "0.0001"
        }
      }
    ]
  },
  {
    "type": "submit",
    "defaultValue": "Speichern & Synchronisieren"
  }
];