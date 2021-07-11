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

app.on("ready", function (){
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

    mainWindow.on("closed", function (){
        app.quit();
    });

    mainWindow.webContents.openDevTools();

    mainWindow.setMenuBarVisibility(false);

    ipcMain.on("AddBook", AddBook);
    ipcMain.on("EditBooks", UpdateBook);
    ipcMain.on("NeedBooks", GrabAllBooks);
    ipcMain.on("DeleteBook", DeleteBook)

    function GrabAllBooks(){
        aws.GetAllItems("Table", (err, data) => {
            if (err) console.log(err)
            else mainWindow.webContents.send("HeresBooks", data)
        })
    }

    function AddBook(event, formData){
        let item = {
            BookName: formData.BookName,
            BookAuthor: formData.BookAuthor,
            BookImage: formData.BookImage
        };

        aws.AddItem("Table", item, (err, data) => {
            if (err) console.log(err)
            else console.log(data)
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
})