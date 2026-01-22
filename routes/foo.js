const requestOptions = {
    method: "GET",
    redirect: "follow"
};

fetch("https://ksp.co.il/web/item/284471", requestOptions)
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
