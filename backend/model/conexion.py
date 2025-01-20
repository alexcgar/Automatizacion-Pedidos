import pyodbc
import pandas as pd

HOST = "10.83.0.14"  # El nombre del servidor
USER = "rpsuser"  # El usuario de la base de datos
PASSWORD = "rpsuser"  # La contraseña del usuario
DATABASE = "RPSNextPersistence"  # Aquí va el nombre de la base de datos


def connectionBD():
    connection_string = f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={HOST};DATABASE={DATABASE};UID={USER};PWD={PASSWORD};TrustServerCertificate=yes"
    try:
        connection = pyodbc.connect(connection_string)  # Establecer la conexión
        print("Connected")
        return connection
    except Exception as e:
        print("Error trying to connect to database:", e)
        return None


def Query():
    conn = connectionBD()
    if conn is not None:
        cur = conn.cursor()
        sql = """
        select Top 35000 CodArticle, Description, Image, IDArticle
        FROM [RPSNovedades2015].[dbo].[STKArticle]
        WHERE InactiveDate is null  AND CodCompany = '1'
        ORDER BY CodArticle;
        """
        

        cur.execute(sql)

        filas = cur.fetchall()
        column_names = [column[0] for column in cur.description]

        cur.close()
        conn.close()

        df = pd.DataFrame.from_records(filas, columns=column_names)
        df.to_csv("backend/model/consulta_resultado.csv", index=False)
        print("Data saved to consulta_resultado.csv")

        return df
    else:
        return None


result = Query()
if result is not None:
    print("Data returned successfully.")
else:
    print("No data returned or connection failed.")
