async function convertMiles(distanceInMiles) {
    return (distanceInMiles * 1.609344).toFixed(3);
}

async function convertKM(distanceInKM) {
    return (distanceInKM / 1.609344).toFixed(3);
}

function convertFeet(lengthInFeet) {
    let input = String(lengthInFeet).trim();

    // Normalize input: handle formats like 5'9, 5"9, 5' 9, 5.9
    if (!input.includes("'") && !input.includes(".")) {
        input += "'0";
    }

    input = input.replace(/"/g, "'").replace(/,/g, ".");

    let feet = 0, inches = 0;

    if (input.includes("'")) {
        const [ft, inch] = input.split("'").map(part => part.trim());
        feet = parseInt(ft, 10) || 0;
        inches = parseInt(inch, 10) || 0;
    } else if (input.includes(".")) {
        const totalFeet = parseFloat(input);
        if (isNaN(totalFeet)) return null;
        feet = Math.floor(totalFeet);
        inches = (totalFeet - feet) * 12;
    } else {
        return null;
    }

    const totalMeters = (feet * 12 + inches) * 0.0254;
    return [feet, inches, totalMeters.toFixed(3)];
}

function convertMeters(lengthInMeters) {
    const meters = parseFloat(String(lengthInMeters).replace(/,/g, "."));
    if (isNaN(meters)) return null;

    const totalInches = meters * 39.3701;
    const feet = Math.floor(totalInches / 12);
    const inches = (totalInches % 12).toFixed(1);
    return [meters, feet, inches];
}

function convertCelsius(tempInCelsius) {
    const celsius = parseFloat(tempInCelsius);
    if (isNaN(celsius)) return null;

    return ((celsius * 9) / 5 + 32).toFixed(2);
}

function convertFahrenheit(tempInFahrenheit) {
    const fahrenheit = parseFloat(tempInFahrenheit);
    if (isNaN(fahrenheit)) return null;

    return (((fahrenheit - 32) * 5) / 9).toFixed(2);
}

module.exports = {
    convertMiles,
    convertKM,
    convertFeet,
    convertMeters,
    convertCelsius,
    convertFahrenheit
};
