namespace LocationTypes {
 
  interface Country {
    id: number;
    name: string;
    iso3: string;
    iso2: string;
    phone_code: string;
    capital: string;
    currency: string;
    currency_symbol: string;
    tld: string;
    native: string;
    region: string;
    subregion: string;
    timezones: [
      {
        zoneName: string;
        gmtOffset: number;
        gmtOffsetName: string;
        abbreviation: string;
        tzName: string;
      },
    ];
    translations: {
      kr: string;
      br: string;
      pt: string;
      nl: string;
      hr: string;
      fa: string;
      de: string;
      es: string;
      fr: string;
      ja: string;
      it: string;
      cn: string;
    };
    latitude: string;
    longitude: string;
    emoji: string;
    emojiU: string;
  }

  interface StateItem {
    id: number;
    name: string;
    country_id: number;
    country_code: string;
    state_code: string;
    latitude: string;
    longitude: string;
  }

  interface CityItem {
    id: number;
    name: string;
    state_id: number;
    state_code: string;
    country_id: number;
    country_code: string;
    latitude: string;
    longitude: string;
  }
}
