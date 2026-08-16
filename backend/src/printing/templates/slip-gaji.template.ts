import { renderDocument, digitalSignatureBlock } from "../layout.util";
import { rupiah } from "../format.util";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return `${BULAN[month - 1]} ${year}`;
}

interface PayslipForPrint {
  period: string;
  baseSalary: bigint;
  allowance: bigint;
  overtimeAmount: bigint;
  gross: bigint;
  bpjs: bigint;
  taxPph21: bigint;
  kasbonInstallment: bigint;
  loanInstallment: bigint;
  deductionTotal: bigint;
  netPay: bigint;
  employee: { name: string; position: string; employmentStatus: string };
  sisaKasbon?: bigint;
  sisaHutang?: bigint;
  issuedByName?: string | null;
}

function row(label: string, val: bigint, minus = false): string {
  return `<div style="display:flex;justify-content:space-between;padding:2px 0;">
    <span style="color:#555555">${label}</span>
    <span style="font-variant-numeric:tabular-nums">${minus ? "&minus;" : ""}${rupiah(val)}</span>
  </div>`;
}

export function slipGajiHtml(payslip: PayslipForPrint): string {
  const sisa = (payslip.sisaKasbon ?? 0n) + (payslip.sisaHutang ?? 0n);
  const body = `
    <div class="doc-title">SLIP GAJI KARYAWAN</div>
    <table style="margin-bottom:16px;font-size:12.5px;">
      <tr>
        <td>Nama : <b>${payslip.employee.name}</b></td>
        <td style="text-align:right">Periode : ${periodLabel(payslip.period)}</td>
      </tr>
      <tr>
        <td>Jabatan : ${payslip.employee.position}</td>
        <td style="text-align:right">Status : ${payslip.employee.employmentStatus}</td>
      </tr>
    </table>
    <table>
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <div style="border-bottom:1px solid #000000;padding-bottom:4px;margin-bottom:4px;font-weight:700;">Pendapatan</div>
          ${row("Gaji Pokok", payslip.baseSalary)}
          ${row("Tunjangan", payslip.allowance)}
          ${row("Lembur", payslip.overtimeAmount)}
          <div style="display:flex;justify-content:space-between;border-top:1px solid #000000;margin-top:4px;padding-top:4px;font-weight:700;">
            <span>Bruto</span><span>${rupiah(payslip.gross)}</span>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;">
          <div style="border-bottom:1px solid #000000;padding-bottom:4px;margin-bottom:4px;font-weight:700;">Potongan</div>
          ${row("BPJS", payslip.bpjs, true)}
          ${row("PPh 21", payslip.taxPph21, true)}
          ${row("Cicilan Kasbon", payslip.kasbonInstallment, true)}
          ${row("Cicilan Hutang", payslip.loanInstallment, true)}
          <div style="display:flex;justify-content:space-between;border-top:1px solid #000000;margin-top:4px;padding-top:4px;font-weight:700;">
            <span>Total Potongan</span><span>&minus;${rupiah(payslip.deductionTotal)}</span>
          </div>
        </td>
      </tr>
    </table>
    <div class="highlight"><span>TERIMA BERSIH</span><span>${rupiah(payslip.netPay)}</span></div>
    ${sisa > 0n ? `<div style="margin-top:8px;font-size:11.5px;color:#555555;">Sisa kasbon/hutang pegawai: ${rupiah(sisa)}</div>` : ""}
    ${digitalSignatureBlock("Diterbitkan oleh (HRD/Keuangan)", payslip.issuedByName ?? null)}
  `;
  return renderDocument(`Slip Gaji ${payslip.employee.name} ${payslip.period}`, body);
}
