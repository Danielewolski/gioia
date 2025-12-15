// Dati persona
var persona = {
    sesso: "donna",
    eta: 18,
    altezzacm: 163,
    pesokg: 53
};

const MAX_PROT_PER_KG = 2.0; // Grammi di proteine per kg di peso corporeo (il tuo limite di 2 g/kg)

const KCAL_PER_MACRO = {
    CARB: 4,
    PROT: 4,
    LIP: 9
};

// Valori medi dei moltiplicatori di attività (TDEE = BMR * fattore)
const activityMultipliers = {
    uomo: {
        riposo: 1.45, // Media di 1.4–1.5
        pesi: 1.65,  // Media di 1.6–1.7
        kickboxing: 1.95 // Media di 1.8–2.1
    },
    donna: {
        riposo: 1.40, // Media di 1.35–1.45
        pesi: 1.60,  // Media di 1.55–1.65
        kickboxing: 1.90 // Media di 1.75–2.0
    }
};

// Distribuzione calorica per pasto (percentuali)
const mealCalorieDistribution = {
    riposo: {
        Colazione: 0.20, Spuntino: 0.10, Pranzo: 0.30, Cena: 0.30,
    },
    pesi: {
        Colazione: 0.25, Spuntino: 0.10, Pranzo: 0.35, Cena: 0.20,
    },
    kickboxing: {
        Colazione: 0.30, Spuntino: 0.10, Pranzo: 0.35, Cena: 0.15, // 0.10-0.15 media 0.125
    }
};

// Percentuali Macronutrienti (usando i valori medi dei range)
const dietMacroProfiles = {
    maintain: {
        low: { prot: 0.325, fat: 0.325, carbs: 0.35 },
        high: { prot: 0.30, fat: 0.245, carbs: 0.455 },
        k1: { prot: 0.275, fat: 0.215, carbs: 0.51 },
    },
    // Deficit (-12.5% medio)
    deficitNormal: {
        low: { prot: 0.35, fat: 0.30, carbs: 0.35 },
        high: { prot: 0.31, fat: 0.225, carbs: 0.465 },
        k1: { prot: 0.285, fat: 0.185, carbs: 0.53 },
    },
    // Deficit (-25% medio)
    deficitFast: {
        low: { prot: 0.375, fat: 0.225, carbs: 0.35 },
        high: { prot: 0.35, fat: 0.20, carbs: 0.45 },
        k1: { prot: 0.325, fat: 0.175, carbs: 0.50 },
    },
};

var BMR;
var dietMode = "maintain"; // "maintain" | "deficitNormal" | "deficitFast"
var targetTDEE = {};


// La funzione BMR usa `pesokg` e `altezzacm`
function calcolaBMR(){
    if (persona.sesso === "uomo") {
        BMR = 10 * persona.pesokg + 6.25 * persona.altezzacm - 5 * persona.eta + 5;
    } else {
        BMR = 10 * persona.pesokg + 6.25 * persona.altezzacm - 5 * persona.eta - 161;
    }
    BMR = Math.round(BMR);
    document.getElementById('bmr-output').textContent = BMR;
}

function calcolaTDEE(){
    if (!BMR) calcolaBMR();
    const multipliers = persona.sesso === "uomo" ? activityMultipliers.uomo : activityMultipliers.donna;

    const tdeeBaseRiposo = BMR * multipliers.riposo;
    const tdeeBasePesi = BMR * multipliers.pesi;
    const tdeeBaseKickboxing = BMR * multipliers.kickboxing;

    let deficitFactor = 1.0;
    if (dietMode === "deficitNormal") {
        deficitFactor = 0.875; 
    } else if (dietMode === "deficitFast") {
        deficitFactor = 0.75;
    }

    targetTDEE.riposo = Math.round(tdeeBaseRiposo * deficitFactor);
    targetTDEE.pesi = Math.round(tdeeBasePesi * deficitFactor);
    targetTDEE.kickboxing = Math.round(tdeeBaseKickboxing * deficitFactor);
    document.getElementById('tdee-riposo-output').textContent = Math.round(targetTDEE.riposo);
    document.getElementById('tdee-pesi-output').textContent = Math.round(targetTDEE.pesi);
    document.getElementById('tdee-kickboxing-output').textContent = Math.round(targetTDEE.kickboxing);   
}

function calcolaMacroPerPasto(giorno, nomePasto) {
    let activityKey; 
    if (giorno === 'HIGH') {
        activityKey = 'pesi';
    } else if (giorno === 'K1') {
        activityKey = 'kickboxing';
    } else { // 'LOW'
        activityKey = 'riposo';
    }

    const tdeeCal = targetTDEE[activityKey];
    const dayMacroProfile = dietMacroProfiles[dietMode][giorno.toLowerCase()];
    
    // -----------------------------------------------------------
    // 1. CALCOLO E LIMITAZIONE PROTEINE
    // -----------------------------------------------------------
    // Calcola i grammi massimi di proteine consentiti (es. 2.0 g/kg * 80kg = 160g)
    const maxProtDailyGrams = Math.round(persona.pesokg * MAX_PROT_PER_KG);
    const maxProtDailyKcal = maxProtDailyGrams * KCAL_PER_MACRO.PROT;
    
    // Calorie Prot che deriverebbero dalla percentuale del profilo macro (es. 32.5% del TDEE)
    const targetProtKcalCalculated = Math.round(tdeeCal * dayMacroProfile.prot);
    
    // Calorie Prot effettive per l'intera giornata (il MINIMO tra la percentuale calcolata e il limite g/kg)
    const actualProtDailyKcal = Math.min(targetProtKcalCalculated, maxProtDailyKcal);

    // -----------------------------------------------------------
    // 2. CALCOLO E RIALLOCAZIONE CALORIE RIMANENTI (CARB + LIP)
    // -----------------------------------------------------------
    
    // Calorie Totali Rimanenti per CARB e LIP
    const remainingDailyKcal = tdeeCal - actualProtDailyKcal;

    // Percentuale originaria di CARB e LIP combinata nel profilo macro
    const originalCarbLipPercent = dayMacroProfile.carbs + dayMacroProfile.fat;
    
    // Calorie rimanenti riallocate a CARB e LIP in modo proporzionale
    const actualCarbDailyKcal = Math.round(remainingDailyKcal * (dayMacroProfile.carbs / originalCarbLipPercent));
    const actualFatDailyKcal = Math.round(remainingDailyKcal * (dayMacroProfile.fat / originalCarbLipPercent));

    // -----------------------------------------------------------
    // 3. DISTRIBUZIONE SUI PASTI (usando la percentuale calorica del pasto)
    // -----------------------------------------------------------
    const mealCaloriePercent = mealCalorieDistribution[activityKey][nomePasto];

    // Distribuzione finale in grammi
    const protGrams = Math.round((actualProtDailyKcal * mealCaloriePercent) / KCAL_PER_MACRO.PROT);
    const carbGrams = Math.round((actualCarbDailyKcal * mealCaloriePercent) / KCAL_PER_MACRO.CARB);
    const fatGrams = Math.round((actualFatDailyKcal * mealCaloriePercent) / KCAL_PER_MACRO.LIP);
    console.log(nomePasto, giorno)
    console.log(carbGrams, protGrams, fatGrams)

    return { carbGrams, protGrams, fatGrams };
}


// CORREZIONE #2: La funzione ora cerca `foodsData` (nome corretto)
function getFoodMacroValues(foodName) {
    const food = foodsData.find(f => f.name.toLowerCase().trim() === foodName.toLowerCase().trim());

    if (!food) {
        return null;
    }

    return {
        carbPerGram: food.carbs / food.grams,
        protPerGram: food.protein / food.grams,
        fatPerGram: food.fat / food.grams,
        unitFactor: food.unitFactor 
    };
}

// Funzione per generare le celle macro (usata sia in populateTableWithCalculations che in populateTable)
function getMacroValueCells(data) {
    // Usa `valore` per la quantità calcolata/statica.
    const value = data.valore !== null && data.valore !== undefined && data.valore !== 0 ? data.valore : '-';
    
    // Cella CARBOIDRATI
    const carbValue = data.CARB ? `<span class="carb">${value}</span>` : '<span class="empty">-</span>';
    // Cella PROTEINE
    const protValue = data.PROT ? `<span class="prot">${value}</span>` : '<span class="empty">-</span>';
    // Cella LIPIDI
    const lipValue = data.LIP ? `<span class="lip">${value}</span>` : '<span class="empty">-</span>';

    return `<td>${carbValue}</td><td>${protValue}</td><td>${lipValue}</td>`;
}

// Funzione di Popolamento Dinamico
function populateTableWithCalculations(data, tableId, nomePasto) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    tableBody.innerHTML = ''; 

    // 1. Calcola i macro target totali per quel pasto (in grammi)
    const macroTargets = {
        HIGH: calcolaMacroPerPasto('HIGH', nomePasto),
        K1: calcolaMacroPerPasto('K1', nomePasto),
        LOW: calcolaMacroPerPasto('LOW', nomePasto)
    };

    data.forEach(item => {
        const row = tableBody.insertRow();
        
        // Colonna ALIMENTO
        const alimentoCell = row.insertCell();
        alimentoCell.textContent = item.alimento;
        alimentoCell.classList.add('alimento-col');
        
        const foodMacroValues = getFoodMacroValues(item.alimento);
        
        // Funzione helper per calcolare il valore da visualizzare
        function calculateTargetValue(giorno, macroKey, isMacroFlag) {
            // Se l'alimento non è nei dati o il flag macro non è attivo, restituisci '-'
            if (!foodMacroValues || !isMacroFlag) {
                return '-';
            }

            // Determina la chiave del macro per grammo e del macro target
            const macroPerGramKey = `${macroKey.toLowerCase()}PerGram`; 
            const targetGramsKey = `${macroKey.toLowerCase()}Grams`;

            const targetGrams = macroTargets[giorno][targetGramsKey];
            const macroPerGram = foodMacroValues[macroPerGramKey];
            const unitFactor = foodMacroValues.unitFactor;

            // Evita divisione per zero
            if (macroPerGram === 0) {
                return '-'; 
            }
            
            // 1. Quantità totale dell'alimento necessaria (in grammi)
            const totalFoodGramsNeeded = targetGrams / macroPerGram;

            // 2. Converti in unità di misura finale
            let finalValue;
            if (item.unità.toUpperCase() === 'GR' || item.unità.toUpperCase() === 'ML') {
                finalValue = Math.round(totalFoodGramsNeeded);
            } else {
                finalValue = Math.round(totalFoodGramsNeeded / unitFactor);
            }

            // Assicurati che non dia 0 se è un macro richiesto
            return finalValue > 0 ? finalValue : 1; // Minimo 1 unità per semplicità
        }
        
        // Estrazione e Calcolo dei valori per le 3 giornate
        
        // HIGH
        const highCarbValue = calculateTargetValue('HIGH', 'CARB', item.HIGH.CARB);
        const highProtValue = calculateTargetValue('HIGH', 'PROT', item.HIGH.PROT);
        const highLipValue = calculateTargetValue('HIGH', 'LIP', item.HIGH.LIP);

        row.innerHTML += getMacroValueCells({
            valore: item.HIGH.CARB ? highCarbValue : (item.HIGH.PROT ? highProtValue : highLipValue),
            CARB: item.HIGH.CARB, PROT: item.HIGH.PROT, LIP: item.HIGH.LIP
        });
        
        // K1
        const k1CarbValue = calculateTargetValue('K1', 'CARB', item.K1.CARB);
        const k1ProtValue = calculateTargetValue('K1', 'PROT', item.K1.PROT);
        const k1LipValue = calculateTargetValue('K1', 'LIP', item.K1.LIP);

        row.innerHTML += getMacroValueCells({
            valore: item.K1.CARB ? k1CarbValue : (item.K1.PROT ? k1ProtValue : k1LipValue),
            CARB: item.K1.CARB, PROT: item.K1.PROT, LIP: item.K1.LIP
        });

        // LOW
        const lowCarbValue = calculateTargetValue('LOW', 'CARB', item.LOW.CARB);
        const lowProtValue = calculateTargetValue('LOW', 'PROT', item.LOW.PROT);
        const lowLipValue = calculateTargetValue('LOW', 'LIP', item.LOW.LIP);

        row.innerHTML += getMacroValueCells({
            valore: item.LOW.CARB ? lowCarbValue : (item.LOW.PROT ? lowProtValue : lowLipValue),
            CARB: item.LOW.CARB, PROT: item.LOW.PROT, LIP: item.LOW.LIP
        });

        // Colonna UNITÀ
        row.insertCell().textContent = item.unità;
    });
}

// --- DATI ALIMENTARI (foodsData) - RESTANO COME DA TE FORNITI ---
const foodsData = [
    // CARBOHYDRATE Sources
    { name: "Frutti", carbs: 15, protein: 1, fat: 0.5, grams: 100, unitFactor: 150, unitType: "UNITÀ" }, // Frutto medio 150g
    { name: "Gallette", carbs: 80, protein: 8, fat: 1, grams: 100, unitFactor: 10, unitType: "UNITÀ" }, // Galletta media 10g
    { name: "WASA", carbs: 70, protein: 10, fat: 2, grams: 100, unitFactor: 10, unitType: "UNITÀ" }, // WASA media 10g
    { name: "Pane", carbs: 50, protein: 8, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cocomero", carbs: 7, protein: 0.5, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Crackers", carbs: 75, protein: 8, fat: 10, grams: 100, unitFactor: 7, unitType: "UNITÀ" }, // Cracker medio 7g
    { name: "Focaccia", carbs: 55, protein: 7, fat: 12, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cioccolato fondente 99%", carbs: 10, protein: 15, fat: 60, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cioccolato al latte", carbs: 55, protein: 8, fat: 30, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fruttosio", carbs: 99, protein: 0, fat: 0, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Zucchero", carbs: 99, protein: 0, fat: 0, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Miele", carbs: 82, protein: 0.3, fat: 0, grams: 100, unitFactor: 15, unitType: "CUCCHIAINI" }, // 1 cucchiaino = 15g
    { name: "Marmellata", carbs: 55, protein: 0.5, fat: 0.1, grams: 100, unitFactor: 15, unitType: "CUCCHIAINI" }, // 1 cucchiaino = 15g
    { name: "Frollini", carbs: 65, protein: 7, fat: 18, grams: 100, unitFactor: 12, unitType: "UNITÀ" }, // Frollino medio 12g
    { name: "Fette biscottate", carbs: 75, protein: 10, fat: 3, grams: 100, unitFactor: 8, unitType: "UNITÀ" }, // Fetta media 8g
    { name: "Riso soffiato/ Farro soffiato", carbs: 80, protein: 8, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fiocchi d’avena", carbs: 60, protein: 12, fat: 7, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Avena decorticata (cotta)", carbs: 18, protein: 4, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Latte d’avena / Latte di riso", carbs: 10, protein: 0.5, fat: 1.5, grams: 100, unitFactor: 1, unitType: "ML" }, // Liquido, 1ml ≈ 1g
    { name: "FARINA (Generico)", carbs: 75, protein: 10, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "AVENA ISTANTANEA", carbs: 68, protein: 15, fat: 7, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Patate", carbs: 18, protein: 2, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Zucca", carbs: 7, protein: 1, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Legumi lessati", carbs: 15, protein: 8, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Melone", carbs: 8, protein: 0.8, fat: 0.1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Mais", carbs: 20, protein: 3, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Polenta (cotta)", carbs: 15, protein: 2, fat: 0.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Pasta", carbs: 73, protein: 13, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Riso", carbs: 77, protein: 12, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Farro", carbs: 65, protein: 15, fat: 2.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cous cous", carbs: 79, protein: 11, fat: 1.9, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Orzo mondo", carbs: 69, protein: 12, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Orzo perlato", carbs: 70, protein: 11, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Gnocchi di patate", carbs: 30, protein: 3, fat: 0.5, grams: 100, unitFactor: 1, unitType: "GR" },
    
    // PROTEIN Sources
    { name: "Whey", carbs: 5, protein: 75, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Salmone affumicato / Pesce spada affumicato", carbs: 0, protein: 25, fat: 10, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tonno / Sgombro sgocciolato", carbs: 0, protein: 25, fat: 8, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Bresaola", carbs: 0, protein: 32, fat: 3, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fesa di tacchino", carbs: 1, protein: 20, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Prosciutto crudo, speck (sgrassato)", carbs: 0, protein: 28, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Prosciutto cotto (sgrassato)", carbs: 0, protein: 20, fat: 3, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Albume", carbs: 1, protein: 10, fat: 0, grams: 100, unitFactor: 1, unitType: "ML" }, // 1ml ≈ 1g
    { name: "Uova di gallina intere", carbs: 0.5, protein: 13, fat: 10, grams: 100, unitFactor: 50, unitType: "UNITÀ" }, // Uovo medio 50g
    { name: "Latte scremato, Latte PS", carbs: 5, protein: 3.5, fat: 1.5, grams: 100, unitFactor: 1, unitType: "ML" }, // 1ml ≈ 1g
    { name: "Ricotta vaccina", carbs: 4, protein: 10, fat: 12, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "KEFIR", carbs: 4, protein: 3.5, fat: 3, grams: 100, unitFactor: 200, unitType: "BICCHIERI" }, // Bicchiere medio 200g
    { name: "Yogurt greco 0%", carbs: 4, protein: 10, fat: 0, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Formaggio spalmabile light, SKYR, ricotta di pecora", carbs: 4, protein: 15, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Parmiggiano grana", carbs: 0, protein: 35, fat: 30, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Latte di soja", carbs: 3, protein: 3.5, fat: 2, grams: 100, unitFactor: 1, unitType: "ML" }, // 1ml ≈ 1g
    { name: "Fiocchi di latte light", carbs: 3, protein: 12, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Caprino, formaggino light", carbs: 1, protein: 15, fat: 10, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Feta, crescenza", carbs: 1, protein: 15, fat: 20, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Sottiletta", carbs: 5, protein: 18, fat: 15, grams: 100, unitFactor: 20, unitType: "GR" },
    { name: "Polpo", carbs: 0, protein: 14, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Gamberi, gamberetti", carbs: 0, protein: 20, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Cozze (Parte edibile)", carbs: 3, protein: 12, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Vongole (Parte edibile)", carbs: 3, protein: 10, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Salmone (Fresco), sogliola, spigola", carbs: 0, protein: 18, fat: 12, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Pesce spada, cefalo muggine, palombo", carbs: 0, protein: 20, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Branzino, cernia, dentice, merluzzo, nasello, granchio", carbs: 0, protein: 16, fat: 1, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tonno (Fresco), occhiata, orata, sarda, sardine, scorfano", carbs: 0, protein: 22, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Pollo, tacchino, faraona (Petto)", carbs: 0, protein: 25, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Vitello, manzo, agnello, coniglio, maiale (Tagli magri)", carbs: 0, protein: 20, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Simmenthal montana", carbs: 0, protein: 20, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Fior di latte, mozzarella light", carbs: 2, protein: 20, fat: 10, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Mozz. di bufala, caciottina fresca", carbs: 1, protein: 16, fat: 24, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Emmenthal, groviera", carbs: 0.1, protein: 28, fat: 30, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Germogli di soja", carbs: 3, protein: 10, fat: 2, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Quorn", carbs: 3, protein: 11, fat: 3, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tofu", carbs: 2, protein: 8, fat: 5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Tempeh", carbs: 10, protein: 19, fat: 11, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Seitan", carbs: 7, protein: 30, fat: 1.5, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Hamburger di soja", carbs: 5, protein: 15, fat: 5, grams: 100, unitFactor: 100, unitType: "UNITÀ" }, // Hamburger medio 100g
    { name: "Salsiccia di soja, hot dog di soja", carbs: 5, protein: 15, fat: 5, grams: 100, unitFactor: 50, unitType: "UNITÀ" }, // Salsiccia media 50g
    
    // LIPID Sources
    { name: "Pinoli", carbs: 10, protein: 14, fat: 70, grams: 100, unitFactor: 5, unitType: "UNITÀ" }, // 5g
    { name: "Pistacchi, arachidi", carbs: 15, protein: 20, fat: 50, grams: 100, unitFactor: 5, unitType: "UNITÀ" }, // 5g
    { name: "Anacardi, mandorle, nocciole", carbs: 20, protein: 20, fat: 55, grams: 100, unitFactor: 5, unitType: "UNITÀ" }, // 5g
    { name: "Noci, noci di macadamia, pecan", carbs: 15, protein: 15, fat: 65, grams: 100, unitFactor: 5, unitType: "UNITÀ" }, // 5g
    { name: "Burro di arachidi", carbs: 20, protein: 25, fat: 50, grams: 100, unitFactor: 20, unitType: "CUCCHIAI" }, // 1 cucchiaio ≈ 20g
    { name: "Burro", carbs: 0, protein: 0.5, fat: 82, grams: 100, unitFactor: 5, unitType: "CUCCHIAINI" }, // 1 cucchiaino ≈ 5g
    { name: "Olive nere, olive verdi", carbs: 4, protein: 1, fat: 15, grams: 100, unitFactor: 10, unitType: "UNITÀ" }, // 10g (circa 5-10 olive)
    { name: "Latte di cocco", carbs: 6, protein: 2, fat: 20, grams: 100, unitFactor: 1, unitType: "GR" },
    { name: "Maionese light", carbs: 5, protein: 1, fat: 30, grams: 100, unitFactor: 10, unitType: "CUCCHIAINI" }, // 1 cucchiaino ≈ 10g
    { name: "Avocado", carbs: 8, protein: 2, fat: 15, grams: 100, unitFactor: 20, unitType: "CUCCHIAI" }, // 1 cucchiaio polpa ≈ 20g
    { name: "Olio EVO", carbs: 0, protein: 0, fat: 100, grams: 100, unitFactor: 10, unitType: "CUCCHIAI" }, // 1 cucchiaio ≈ 10g
];