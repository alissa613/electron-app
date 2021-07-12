"use scrict";

const path = require("path");
const url = require("url");
const $AWS = require("./modules/aws-handler");
const { app, BrowserWindow, ipcMain } = require("electron");

if (process.env.LIVE_RELOAD == "true") require("./modules/reload")(__dirname);

let aws = new $AWS(
    "AKIA4US7MEW7BUKOFLU7",
    "QdYKyQnoIJ/3PZ9tRMWJxObiYfrEC1SJ3euGGnVc"
)

var mainWindow;

app.on("ready", function () {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "src/login.html"),
            protocol: "file:",
            slashes: true,
        })
    );

    mainWindow.on("closed", function () {
        app.quit();
    });

    mainWindow.webContents.openDevTools();

    mainWindow.setMenuBarVisibility(false);

    //Book
    ipcMain.on("AddBook", AddBook);
    ipcMain.on("EditBook", UpdateBook);
    ipcMain.on("NeedBooks", GrabAllBooks);
    ipcMain.on("DeleteBook", DeleteBook)

    //Craft
    ipcMain.on("AddCraft", AddCraft);
    ipcMain.on("EditCraft", UpdateCraft);
    ipcMain.on("NeedCrafts", GrabAllCrafts);
    ipcMain.on("DeleteCraft", DeleteCraft)

    function GrabAllBooks() {
        aws.GetAllItems("Table", (err, data) => {
            if (err) console.log(err)
            else mainWindow.webContents.send("HeresBooks", data)
        })
    }

    function AddBook(event, formData) {
        let item = {
            BookName: formData.BookName,
            BookAuthor: formData.BookAuthor,
            BookImage: formData.BookImage
        };

        aws.AddItem("Table", item, (err, data) => {
            if (err) console.log(err)
            else {
                console.log(data)
                GrabAllBooks()
            }
        });
    }

    function UpdateBook(event, formData) {
        let item = {
            BookName: formData.BookName,
            BookAuthor: formData.BookAuthor,
            BookImage: formData.BookImage
        };

        aws.UpdateItem("Table", item, formData.PrimaryKey, (err, data) => {
            if (err) console.log(err)
            else {
                console.log(data)
                GrabAllBooks()
            }
        });
    }

    function DeleteBook(event, formData) {
        aws.DeleteItem("Table", formData.PrimaryKey, (err, data) => {
            if (err) console.log(err)
            else console.log(data)
        });
    }

    function AddCraft(event, formData) {
        console.log(formData.CraftDescription)
        let item = {
            CraftName: formData.CraftName,
            CraftSupplies: formData.CraftSupplies,
            CraftDescription: formData.CraftDescription,
            CraftImage: formData.CraftImage
        };

        console.log(item)
        aws.AddItem("Craft", item, (err, data) => {
            if (err) console.log(err)
            else {
                console.log(data)
                GrabAllCrafts();
            }
        });
    }

    function GrabAllCrafts() {
        aws.GetAllItems("Craft", (err, data) => {
            if (err) console.log(err)
            else mainWindow.webContents.send("HeresCrafts", data)
        })
    }

    function UpdateCraft(event, formData) {
        let item = {
            CraftName: formData.CraftName,
            CraftSupplies: formData.CraftSupplies,
            CraftDescription: formData.CraftDescription,
            CraftImage: formData.CraftImage
        };

        aws.UpdateItem("Craft", item, formData.PrimaryKey, (err, data) => {
            if (err) console.log(err)
            else {
                console.log(data)
                GrabAllCrafts()
            }
        });
    }

    function DeleteCraft(event, formData) {
        aws.DeleteItem("Craft", formData.PrimaryKey, (err, data) => {
            if (err) console.log(err)
            else console.log(data)
        });
    }
})