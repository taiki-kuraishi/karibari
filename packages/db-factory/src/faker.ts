import { Faker, base, en, ja } from "@faker-js/faker";

export const fk = new Faker({ locale: [ja, en, base], seed: 0 });

export const fakeUnixTimestamp = () => Math.floor(fk.date.past().getTime() / 1000);
