/**
 * TaxLens AI - Vietnamese Tax Code (Mã Số Thuế) Validator & Enterprise Registry Sentinel
 * Standards: Tổng Cục Thuế Việt Nam - Thông tư 105/2020/TT-BTC
 */

// Bảng mã 2 chữ số đầu của Tỉnh/Thành phố theo danh mục Tổng Cục Thuế
const PROVINCE_CODES = {
  '01': 'Hà Nội',
  '02': 'Hải Phòng',
  '03': 'TP. Hồ Chí Minh',
  '04': 'Quảng Ninh',
  '05': 'Hà Giang',
  '06': 'Cao Bằng',
  '07': 'Bắc Kạn',
  '08': 'Tuyên Quang',
  '09': 'Lào Cai',
  '10': 'Điện Biên',
  '11': 'Lai Châu',
  '12': 'Sơn La',
  '14': 'Yên Bái',
  '15': 'Hòa Bình',
  '17': 'Thái Nguyên',
  '18': 'Lạng Sơn',
  '19': 'Bắc Giang',
  '20': 'Phú Thọ',
  '22': 'Vĩnh Phúc',
  '23': 'Bắc Ninh',
  '24': 'Hải Dương',
  '25': 'Hưng Yên',
  '26': 'Thái Bình',
  '27': 'Hà Nam',
  '28': 'Nam Định',
  '29': 'Ninh Bình',
  '30': 'Thanh Hóa',
  '31': 'Nghệ An',
  '32': 'Hà Tĩnh',
  '33': 'Quảng Bình',
  '34': 'Quảng Trị',
  '35': 'Thừa Thiên Huế',
  '36': 'Đà Nẵng',
  '37': 'Quảng Nam',
  '38': 'Quảng Ngãi',
  '39': 'Bình Định',
  '40': 'Phú Yên',
  '41': 'Khánh Hòa',
  '42': 'Ninh Thuận',
  '43': 'Bình Thuận',
  '44': 'Kon Tum',
  '45': 'Gia Lai',
  '46': 'Đắk Lắk',
  '47': 'Đắk Nông',
  '48': 'Lâm Đồng',
  '49': 'Bình Phước',
  '50': 'Tây Ninh',
  '51': 'Bình Dương',
  '52': 'Đồng Nai',
  '53': 'Bà Rịa - Vũng Tàu',
  '54': 'Long An',
  '55': 'Đồng Tháp',
  '56': 'An Giang',
  '57': 'Tiền Giang',
  '58': 'Vĩnh Long',
  '59': 'Bến Tre',
  '60': 'Kiên Giang',
  '61': 'Cần Thơ',
  '62': 'Hậu Giang',
  '63': 'Sóc Trăng',
  '64': 'Bạc Liêu',
  '65': 'Cà Mau'
};

// Database danh mục một số doanh nghiệp tiêu biểu để tra cứu nhanh & kiểm tra thực tế
const KNOWN_ENTERPRISES = {
  '0101248141': {
    name: 'CÔNG TY CỔ PHẦN FPT',
    shortName: 'FPT CORP',
    address: 'Tòa nhà FPT, số 10 phố Phạm Văn Bạch, Cầu Giấy, Hà Nội',
    status: 'Đang hoạt động (Đã được cấp GCN ĐKT)',
    taxAuthority: 'Cục Thuế Thành phố Hà Nội',
    representative: 'Nguyễn Văn Khoa',
    established: '13/09/1988'
  },
  '0303490096': {
    name: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG',
    shortName: 'VNG CORP',
    address: 'Z06 Đường số 13, Khu chế xuất Tân Thuận, Quận 7, TP. Hồ Chí Minh',
    status: 'Đang hoạt động (Đã được cấp GCN ĐKT)',
    taxAuthority: 'Cục Thuế TP. Hồ Chí Minh',
    representative: 'Lê Hồng Minh',
    established: '09/09/2004'
  },
  '0100109106': {
    name: 'TẬP ĐOÀN CÔNG NGHIỆP - VIỄN THÔNG QUÂN ĐỘI',
    shortName: 'VIETTEL GROUP',
    address: 'Lô D26, Khu đô thị mới Cầu Giấy, Yên Hòa, Cầu Giấy, Hà Nội',
    status: 'Đang hoạt động (Đã được cấp GCN ĐKT)',
    taxAuthority: 'Cục Thuế Thành phố Hà Nội',
    representative: 'Tào Đức Thắng',
    established: '01/06/1989'
  },
  '0300588569': {
    name: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM',
    shortName: 'VINAMILK',
    address: 'Số 10 Tân Trào, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh',
    status: 'Đang hoạt động (Đã được cấp GCN ĐKT)',
    taxAuthority: 'Cục Thuế TP. Hồ Chí Minh',
    representative: 'Mai Kiều Liên',
    established: '20/08/1976'
  },
  '0312653665': {
    name: 'CÔNG TY CỔ PHẦN ĐẦU TƯ THẾ GIỚI DI ĐỘNG',
    shortName: 'MWG',
    address: 'Tòa nhà MWG, Lô T2-1.2, Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh',
    status: 'Đang hoạt động (Đã được cấp GCN ĐKT)',
    taxAuthority: 'Cục Thuế TP. Hồ Chí Minh',
    representative: 'Nguyễn Đức Tài',
    established: '16/01/2014'
  },
  '0314051066': {
    name: 'CÔNG TY TNHH GRAB',
    shortName: 'GRAB VIETNAM',
    address: 'Tòa nhà Mapletree Business Centre, 1060 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
    status: 'Đang hoạt động (Đã được cấp GCN ĐKT)',
    taxAuthority: 'Cục Thuế TP. Hồ Chí Minh',
    representative: 'Alejandro Osorio',
    established: '14/10/2014'
  },
  '0100107618': {
    name: 'TẬP ĐOÀN XĂNG DẦU VIỆT NAM',
    shortName: 'PETROLIMEX',
    address: 'Số 1 Khâm Thiên, Phường Khâm Thiên, Quận Đống Đa, Hà Nội',
    status: 'Đang hoạt động (Đã được cấp GCN ĐKT)',
    taxAuthority: 'Cục Thuế Thành phố Hà Nội',
    representative: 'Phạm Văn Thanh',
    established: '13/03/1956'
  }
};

/**
 * Thuật toán tính số kiểm tra Checksum Modulo 11 của Tổng Cục Thuế Việt Nam
 * Trọng số các số hạng: 31, 29, 23, 19, 17, 13, 7, 5, 3
 */
function verifyTaxChecksum(cleanDigits) {
  if (cleanDigits.length < 10) return false;
  const weights = [31, 29, 23, 19, 17, 13, 7, 5, 3];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanDigits[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  const expectedCheckDigit = 10 - remainder;

  // Nếu số kiểm tra là 10 thì theo quy chuẩn sẽ là số đặc biệt hoặc 0
  const actualCheckDigit = parseInt(cleanDigits[9], 10);
  
  // Tổng Cục Thuế: Thông thường d10 = 10 - (sum % 11). Nếu remainder == 0 thì d10 = 0.
  if (remainder === 0) {
    return actualCheckDigit === 0;
  }
  return expectedCheckDigit === actualCheckDigit;
}

/**
 * Xác thực toàn diện một mã số thuế
 * @param {string} rawTaxCode 
 * @returns {object} Kết quả phân tích chi tiết
 */
function validateTaxCode(rawTaxCode) {
  if (!rawTaxCode || typeof rawTaxCode !== 'string') {
    return {
      isValid: false,
      taxCode: rawTaxCode || '',
      error: 'Mã số thuế không được để trống.',
      riskLevel: 'CRITICAL'
    };
  }

  // Loại bỏ khoảng trắng và dấu gạch nối
  const sanitized = rawTaxCode.trim().replace(/\s+/g, '');
  const isBranchFormat = sanitized.includes('-');
  const digitsOnly = sanitized.replace(/[^0-9]/g, '');

  // 1. Kiểm tra độ dài: chuẩn 10 chữ số (doanh nghiệp mẹ) hoặc 13 chữ số (chi nhánh)
  if (digitsOnly.length !== 10 && digitsOnly.length !== 13) {
    return {
      isValid: false,
      taxCode: sanitized,
      digits: digitsOnly,
      error: `Độ dài MST không hợp lệ (${digitsOnly.length} chữ số). Chuẩn Việt Nam là 10 số (doanh nghiệp) hoặc 13 số (chi nhánh).`,
      riskLevel: 'HIGH',
      recommendation: 'Kiểm tra lại số ký tự trên hóa đơn hoặc giấy phép kinh doanh.'
    };
  }

  // 2. Kiểm tra mã tỉnh (2 số đầu)
  const provinceCode = digitsOnly.substring(0, 2);
  const provinceName = PROVINCE_CODES[provinceCode] || 'Mã vùng đặc thù / Bộ ngành';

  // 3. Tính toán Checksum Modulo 11
  const isChecksumValid = verifyTaxChecksum(digitsOnly.substring(0, 10));

  // 4. Xác định loại hình
  let entityType = 'Doanh nghiệp / Tổ chức kinh tế độc lập';
  let branchCode = null;
  if (digitsOnly.length === 13) {
    branchCode = digitsOnly.substring(10, 13);
    entityType = `Chi nhánh / Văn phòng đại diện (Mã chi nhánh #${branchCode})`;
  }

  // 5. Tra cứu dữ liệu đã biết (nếu có)
  const parentTax = digitsOnly.substring(0, 10);
  const knownData = KNOWN_ENTERPRISES[parentTax] || null;

  // 6. Đánh giá rủi ro
  let riskLevel = 'LOW';
  let statusMessage = 'Hợp lệ theo tiêu chuẩn Tổng Cục Thuế';

  if (!isChecksumValid) {
    riskLevel = 'HIGH';
    statusMessage = 'Cảnh báo: Sai thuật toán Checksum Modulo 11. Khả năng cao là MST giả hoặc gõ nhầm số.';
  } else if (!PROVINCE_CODES[provinceCode]) {
    riskLevel = 'MEDIUM';
    statusMessage = 'Mã vùng cấp ngoài danh mục thông thường.';
  }

  return {
    isValid: isChecksumValid,
    taxCode: digitsOnly.length === 13 ? `${parentTax}-${branchCode}` : parentTax,
    rawInput: rawTaxCode,
    digitsCount: digitsOnly.length,
    entityType,
    provinceCode,
    provinceName,
    checksumVerified: isChecksumValid,
    riskLevel,
    statusMessage,
    enterpriseInfo: knownData ? {
      name: knownData.name,
      shortName: knownData.shortName,
      address: knownData.address,
      status: knownData.status,
      taxAuthority: knownData.taxAuthority,
      representative: knownData.representative,
      established: knownData.established
    } : {
      name: `Doanh nghiệp đăng ký tại ${provinceName}`,
      status: isChecksumValid ? 'Đang hoạt động (Dự kiến)' : 'Cần đối soát giấy phép',
      taxAuthority: `Cục Thuế tỉnh/thành phố ${provinceName}`,
      isVerifiedInRegistry: false
    }
  };
}

module.exports = {
  validateTaxCode,
  verifyTaxChecksum,
  PROVINCE_CODES,
  KNOWN_ENTERPRISES
};
