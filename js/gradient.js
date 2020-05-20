function colorGradient(sColor) {
    const reg = new RegExp(/^0x([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/);
    let color = sColor.toLowerCase();
    if (color && reg.test(color)) {
        const colorArray = [];
        // like '0xfff'
        if (color.length === 5) {
            let newColor = "0x";
            const colorArr = color.split('');
            for (var i = 2; i < 5; i += 1) {
                newColor += `${colorArr[i]}${colorArr[i]}`;
            }
            // '0xfff' => '0xffffff'
            color = newColor;
        }
        // change to array
        for (let i = 2; i < 8; i += 2) {
            colorArray.push(parseInt("0x" + color.slice(i, i + 2)));
        }
        return colorArray;
    } else {
        return color;
    }
}