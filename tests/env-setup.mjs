// Har test run se PEHLE load hota hai (--import). Default behaviour: tests
// hamesha ek ALAG database par chalein, production (MONGODB_URI ka default
// db) par kabhi nahi. Pehle aisa nahi tha — CI ke tests aur route-suite ka
// afterEach full-DB restore production par chala karta tha, aur usi se
// registered users (jaise khubaib9221@gmail.com) wipe hue the.
//
// Override karne ke liye: MONGODB_DB=some_db npm test (ya shell env).
process.env.MONGODB_DB = process.env.MONGODB_DB?.trim() || "dryfruitadda_test";
