import {
  config,
  configureClient,
} from "./appwrite.mjs";
import { installDatabase } from "./database.mjs";
import { installFunction } from "./function.mjs";
import { installSite } from "./site.mjs";

configureClient();
installDatabase();
installFunction();
installSite();

console.log(`Installed ${config.name} Appwrite resources.`);
console.log("Complete the DNS verification requested by Appwrite for both custom domains.");
