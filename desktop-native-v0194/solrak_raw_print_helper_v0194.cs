using System;
using System.IO;
using System.Runtime.InteropServices;

public static class SolrakRawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOC_INFO_1
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool OpenPrinter(string printerName, out IntPtr printer, IntPtr defaults);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr printer);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern uint StartDocPrinter(IntPtr printer, int level, [In] DOC_INFO_1 docInfo);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr printer);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr printer);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr printer);

    [DllImport("winspool.Drv", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr printer, IntPtr bytes, int count, out int written);

    public static bool Send(string printerName, string rawFile)
    {
        if (String.IsNullOrWhiteSpace(printerName) || String.IsNullOrWhiteSpace(rawFile) || !File.Exists(rawFile)) return false;
        byte[] data = File.ReadAllBytes(rawFile);
        if (data.Length == 0) return false;

        IntPtr printer;
        if (!OpenPrinter(printerName, out printer, IntPtr.Zero))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "OpenPrinter falló");

        IntPtr unmanaged = IntPtr.Zero;
        bool docStarted = false;
        bool pageStarted = false;
        try
        {
            var docInfo = new DOC_INFO_1 { pDocName = "SOLRAK Ticket", pDataType = "RAW", pOutputFile = null };
            if (StartDocPrinter(printer, 1, docInfo) == 0)
                throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter falló");
            docStarted = true;
            if (!StartPagePrinter(printer))
                throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter falló");
            pageStarted = true;

            unmanaged = Marshal.AllocCoTaskMem(data.Length);
            Marshal.Copy(data, 0, unmanaged, data.Length);
            int written;
            if (!WritePrinter(printer, unmanaged, data.Length, out written))
                throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter falló");
            if (written != data.Length)
                throw new IOException("Windows Print Spooler escribió un número incompleto de bytes.");
            return true;
        }
        finally
        {
            if (unmanaged != IntPtr.Zero) Marshal.FreeCoTaskMem(unmanaged);
            if (pageStarted) EndPagePrinter(printer);
            if (docStarted) EndDocPrinter(printer);
            ClosePrinter(printer);
        }
    }
}
