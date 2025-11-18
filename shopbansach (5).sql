-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 18, 2025 at 04:12 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `shopbansach`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `reset_and_seed_year` (IN `p_year` INT, IN `p_min` INT, IN `p_max` INT)   BEGIN
  DECLARE m INT DEFAULT 1;
  DECLARE i INT;
  DECLARE cnt INT;

  DECLARE day INT; DECLARE hh INT; DECLARE mi INT; DECLARE ss INT;
  DECLARE ts DATETIME;

  DECLARE pid INT; DECLARE pname VARCHAR(255); DECLARE pprice DECIMAL(18,2);
  DECLARE qty INT; DECLARE item_price DECIMAL(18,2);
  DECLARE total DECIMAL(18,2);
  DECLARE season DECIMAL(10,4);
  DECLARE cartItems TEXT;

  /* 1) Xóa toàn bộ orders và reset sold */
  DELETE FROM orders;
  UPDATE product SET sold = 0;

  /* 2) Seed 12 tháng */
  WHILE m <= 12 DO
    /* số đơn trong tháng m */
    SET cnt = FLOOR(RAND()*(p_max - p_min + 1)) + p_min;
    /* seasonal factor để đường lên/xuống theo mùa */
    SET season = 0.8 + 0.4 * SIN(m/12*2*PI());

    SET i = 1;
    WHILE i <= cnt DO
      /* chọn 1 sản phẩm ngẫu nhiên */
      SELECT id, name, price INTO pid, pname, pprice
      FROM product ORDER BY RAND() LIMIT 1;

      SET qty = FLOOR(RAND()*3) + 1;
      SET item_price = IFNULL(pprice, FLOOR(50000 + RAND()*150000));
      SET total = ROUND(item_price * qty * season);

      /* random thời điểm trong tháng */
      SET day = FLOOR(RAND()*28) + 1;
      SET hh  = FLOOR(RAND()*12) + 9;
      SET mi  = FLOOR(RAND()*60);
      SET ss  = FLOOR(RAND()*60);
      SET ts  = STR_TO_DATE(CONCAT(p_year,'-',LPAD(m,2,'0'),'-',LPAD(day,2,'0'),' ',
                                   LPAD(hh,2,'0'),':',LPAD(mi,2,'0'),':',LPAD(ss,2,'0')),
                            '%Y-%m-%d %H:%i:%s');

      /* cartItems: 1 item dạng JSON */
      SET cartItems = CAST(JSON_ARRAY(
                        JSON_OBJECT('id',pid,'name',pname,'price',item_price,'quantity',qty)
                      ) AS CHAR);

      INSERT INTO orders
        (fullName, email,    mobile,      address,   state,      paymentMethod, total, cartItems, status,     created_at)
      VALUES
        ('Demo User','demo@example.com','0123456789','HCMC, VN','completed',   'cod', total, cartItems,'completed', ts);

      UPDATE product SET sold = sold + qty WHERE id = pid;

      SET i = i + 1;
    END WHILE;

    SET m = m + 1;
  END WHILE;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `seed_orders_year` (IN `p_year` INT, IN `p_per_min` INT, IN `p_per_max` INT)   BEGIN
  DECLARE m INT DEFAULT 1;          -- month
  DECLARE cnt INT;                  -- số đơn / tháng
  DECLARE k INT;                    -- vòng lặp đơn trong tháng
  DECLARE items INT;                -- số sản phẩm trong đơn
  DECLARE i INT;                    -- vòng lặp item
  DECLARE prod_id INT;
  DECLARE prod_price DECIMAL(12,2);
  DECLARE qty INT;
  DECLARE d DATE;
  DECLARE ts DATETIME;
  DECLARE hh INT;
  DECLARE mi INT;
  DECLARE ss INT;
  DECLARE total DECIMAL(14,2);
  DECLARE cart_s TEXT;
  DECLARE season DECIMAL(6,3);

  SET m = 1;
  WHILE m <= 12 DO
    -- hệ số mùa vụ nhẹ để đường biểu đồ có lên xuống
    SET season = 0.8 + 0.4 * SIN((m/12.0)*PI()*2.0);

    -- số đơn của tháng m
    SET cnt = FLOOR(RAND()*(p_per_max - p_per_min + 1)) + p_per_min;
    SET k = 1;
    WHILE k <= cnt DO
      SET d = STR_TO_DATE(CONCAT(p_year, '-', LPAD(m,2,'0'), '-', LPAD(FLOOR(RAND()*28)+1,2,'0')), '%Y-%m-%d');
      SET hh = FLOOR(RAND()*12)+9;     -- 09..20h
      SET mi = FLOOR(RAND()*60);
      SET ss = FLOOR(RAND()*60);
      SET ts = TIMESTAMP(d, MAKETIME(hh, mi, ss));

      SET items = FLOOR(RAND()*3)+1;   -- 1..3 sản phẩm / đơn
      SET i = 1;
      SET total = 0;
      SET cart_s = '[';

      WHILE i <= items DO
        -- chọn 1 sản phẩm ngẫu nhiên
        SELECT p.id, COALESCE(NULLIF(p.price,0), FLOOR(50000 + RAND()*150000))
        INTO prod_id, prod_price
        FROM product p
        ORDER BY RAND()
        LIMIT 1;

        SET qty = FLOOR(RAND()*3)+1;   -- 1..3
        SET total = total + prod_price * qty;

        -- nối JSON cartItems
        SET cart_s = CONCAT(
          cart_s,
          CASE WHEN i>1 THEN ',' ELSE '' END,
          '{\"id\":', prod_id,
          ',\"quantity\":', qty,
          ',\"price\":', prod_price, '}'
        );

        -- cập nhật sold
        UPDATE product SET sold = sold + qty WHERE id = prod_id;

        SET i = i + 1;
      END WHILE;

      SET cart_s = CONCAT(cart_s, ']');
      SET total = ROUND(total * season, 0);

      -- chèn order với created_at theo tháng
      INSERT INTO orders
        (fullName, email, mobile, address, state, paymentMethod, total, cartItems, status, created_at)
      VALUES
        ('Demo User', 'demo@example.com', '0123456789', 'HCMC, VN', 'completed', 'cod', total, cart_s, 'completed', ts);

      SET k = k + 1;
    END WHILE;

    SET m = m + 1;
  END WHILE;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `email`, `password`) VALUES
(1, 'admin@123', '123456');

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `fullName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `address` varchar(255) NOT NULL,
  `state` varchar(100) NOT NULL,
  `paymentMethod` varchar(50) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `cartItems` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cartItems`)),
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `status` enum('pending','processing','completed','cancelled') NOT NULL DEFAULT 'pending',
  `voucher_code` varchar(50) DEFAULT NULL,
  `discount_amount` decimal(12,2) DEFAULT 0.00,
  `user_voucher_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `fullName`, `email`, `mobile`, `address`, `state`, `paymentMethod`, `total`, `createdAt`, `cartItems`, `user_id`, `created_at`, `status`, `voucher_code`, `discount_amount`, `user_voucher_id`) VALUES
(1, 'Test user1', '', '0358134836', 'tl02', 'Hồ Chí Minh', 'cod', 774900.00, '2025-11-18 12:49:29', '[{\"id\":21,\"name\":\"Dấu ấn Hoàng Gia\",\"price\":\"123.00\",\"img\":\"/assets/img/product-1.webp\",\"description\":\"Tương truyền, khi chòm sao Sopdet xuất hiện ở Ai Cập ta, một thiếu nữ hoàng kim tỏa hào quang rực rỡ sẽ hiện thân bên bờ sông Nile...Nàng là con gái nữ thần sông Nile Hapi.Với dung mạo kiều diễm tựa dòng chảy sông Nile, cùng nụ cười mê hoặc lòng người, thiếu nữ do mẹ hiền sông Nile hạ sinh sẽ ban phước lành cho mảnh đất sa mạc của chúng ta...\",\"rating\":\"3.7\",\"sold\":194,\"sale_total\":0,\"sale_sold\":10,\"supplier\":null,\"publisher\":null,\"author\":null,\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":3,\"stock\":1,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":7}]', 1, '2025-11-18 19:49:29', 'pending', NULL, 0.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `party`
--

CREATE TABLE `party` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('publisher','author') NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `party`
--

INSERT INTO `party` (`id`, `name`, `type`, `description`, `created_at`) VALUES
(1, 'Tố Hữu', 'author', NULL, '2025-11-13 08:47:06');

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `img` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `rating` decimal(2,1) NOT NULL DEFAULT 4.5,
  `sold` int(11) NOT NULL DEFAULT 0,
  `sale_total` int(11) NOT NULL DEFAULT 0,
  `sale_sold` int(11) NOT NULL DEFAULT 0,
  `supplier` varchar(255) DEFAULT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `author` varchar(255) DEFAULT NULL,
  `coverType` varchar(100) DEFAULT NULL,
  `discount` int(11) DEFAULT NULL,
  `oldPrice` decimal(10,2) DEFAULT NULL,
  `isNew` tinyint(1) NOT NULL DEFAULT 0,
  `rating_count` int(11) NOT NULL DEFAULT 0,
  `stock` int(11) NOT NULL DEFAULT 0,
  `category_id` int(11) DEFAULT NULL,
  `publisher_id` int(11) DEFAULT NULL,
  `author_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`id`, `name`, `price`, `img`, `description`, `rating`, `sold`, `sale_total`, `sale_sold`, `supplier`, `publisher`, `author`, `coverType`, `discount`, `oldPrice`, `isNew`, `rating_count`, `stock`, `category_id`, `publisher_id`, `author_id`) VALUES
(1, 'Để Đời Không Bốc Hỏa', 119.00, '/assets/img/product-2.webp', 'Với nhiều kiến thức về các huyệt đạo...', 0.0, 199, 1000, 367, 'NXB Kim Đồng', 'Kim Đồng', 'Nhiều tác giả', 'Bìa mềm', 20, 148.75, 1, 0, 15, NULL, NULL, NULL),
(2, 'Tuyển tập Vũ Trọng Phụng', 121.00, '/assets/img/product-3.webp', 'Cái độc đáo của Vũ Trọng Phụng...', 5.0, 236, 0, 31, 'NXB Văn Học', 'Văn Học', 'Vũ Trọng Phụng', 'Bìa mềm', NULL, NULL, 0, 1, 6, NULL, NULL, NULL),
(3, 'Thiên Tài Bên Trái, Kẻ Điên Bên Phải', 123.00, '/assets/img/product-4.webp', 'NẾU MỘT NGÀY ANH THẤY TÔI ĐIÊN...', 0.0, 183, 0, 8, 'NXB Thế Giới', 'Thế Giới', 'Cao Minh', 'Bìa mềm', 10, 136.67, 0, 0, 7, NULL, NULL, NULL),
(4, 'Suối Cọp', 123.00, '/assets/img/product-6.webp', 'Suối Cọp được viết...', 0.0, 168, 500, 127, 'NXB Trẻ', 'Trẻ', 'Nhiều tác giả', 'Bìa mềm', NULL, NULL, 0, 0, 10, NULL, NULL, NULL),
(5, 'Để Đời Không Bốc Hỏa', 119.00, '/assets/img/product-2.webp', 'Với nhiều kiến thức về các huyệt đạo đặc biệt hiệu quả trong việc trừ hỏa từ các cơ quan nội tạng, các chương trình thực hành chữa bệnh và duy trì sức khỏe từ những bậc thầy về y học cổ truyền Trung Hoa, các bữa ăn dễ thực hiện để loại bỏ hỏa, cuốn sách này sẽ giúp bạn điều hòa thể chất và tinh thần, tăng cường sinh lực và thể lực, để đời không bốc hỏa và tràn đầy năng lượng.', 0.0, 170, 0, 14, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 9, NULL, NULL, NULL),
(6, 'Tuyển tập Vũ Trọng Phụng', 121.00, '/assets/img/product-3.webp', 'Cái độc đáo của Vũ Trọng Phụng thì rất nhiều. Ông mất rất sớm nhưng đã để lại 8 tiểu thuyết, 4 phóng sự dài, nhiều bài báo, tiểu luận. Trường hợp đó trong lịch sử NXB Văn Học thế giới rất hiếm. Trong số các tác phẩm đó, tôi thấy Vũ Trọng Phụng có hai tiểu thuyết “Số đỏ” và “Giông tố” là hai tiểu thuyết quan trọng nhất trong lịch sử NXB Văn Học Việt Nam thế kỉ XX.', 0.0, 186, 0, 4, NULL, NULL, 'Vũ Trọng Phụng', 'Bìa mềm', NULL, NULL, 0, 0, 7, NULL, NULL, NULL),
(7, 'Thiên Tài Bên Trái, Kẻ Điên Bên Phải (Tái Bản 2021)', 123.00, '/assets/img/product-4.webp', 'NẾU MỘT NGÀY ANH THẤY TÔI ĐIÊN, THỰC RA CHÍNH LÀ ANH ĐIÊN ĐẤY! Hỡi những con người đang oằn mình trong cuộc sống, bạn biết gì về thế giới của mình? Là vô vàn thứ lý thuyết được các bậc vĩ nhân kiểm chứng, là luật lệ, là cả nghìn thứ sự thật bọc trong cái lốt hiển nhiên, hay những triết lý cứng nhắc của cuộc đời', 5.0, 203, 0, 1, NULL, NULL, 'Cao Minh', 'Bìa mềm', NULL, NULL, 0, 1, 7, NULL, NULL, NULL),
(8, 'Đám Trẻ Ở Đại Dương Đen', 120.00, '/assets/img/product-5.webp', 'Một cuốn sách hấp dẫn về câu chuyện của những đứa trẻ tại Đại Dương Đen.', 4.0, 170, 0, 5, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 1, 5, NULL, NULL, NULL),
(9, 'Suối Cọp', 123.00, '/assets/img/product-6.webp', 'Suối Cọp được viết lên bởi hiện thực và hoàn cảnh chiến tranh đạn bom khốc liệt nằm ở “Hành lang phía Tây” Trường Sơn, nên nó phản ánh một hiện thực vô cùng chân thực, là cuộc sống chiến đấu gian nan, là không tránh khỏi những hy sinh mất mát. Nhưng ở đó có những con người giàu nghĩa tình, những anh hùng trong trận chiến. Đó là những người Đại đội trưởng máu lửa, như Đại đội trưởng Tuần “râu”, Đại đội trưởng Quyết “điên”.', 0.0, 161, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 2, NULL, NULL, NULL),
(10, 'Tết Ở Làng Địa Ngục', 123.00, '/assets/img/product-7.webp', 'Tết ở Làng Địa Ngục xoay quanh câu chuyện về một ngôi làng nhỏ, hẻo lánh mang tên Địa Ngục. Cái tên ám ảnh này đã ám ảnh người dân trong làng từ đời này sang đời khác. Mỗi dịp Tết đến, làng lại chìm vào một không khí u ám, đầy bí ẩn. Những cái chết bất thường, những lời nguyền rủa, những truyền thuyết kỳ bí... tất cả đã tạo nên một bầu không khí căng thẳng, hồi hộp cho câu chuyện.', 0.0, 203, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 5, NULL, NULL, NULL),
(11, 'Big Book - Cuốn Sách Khổng Lồ Về Các Ngôi Sao Và Các Hành Tinh (Tái Bản)', 99.00, '/assets/img/product-8.webp', 'Thì ra, Trái đất chỉ là một hành tinh nhỏ bé trong vũ trụ bao la. Thì ra, Mặt trời là một quả cầu lửa khổng lồ chứa toàn những khí là khí. Thì ra, trong số những ngôi sao tưởng như nhỏ xíu trên bầu trời, có những ngôi sao còn lớn hơn cả Mặt trời... Và còn rất nhiều những chuyện khó tin nữa đang ẩn chứa trong cuốn sách khổng lồ này mà các bạn nhất định không thể bỏ lỡ.', 0.0, 152, 0, 1, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 12, NULL, NULL, NULL),
(12, 'Dấu ấn Hoàng Gia', 123.00, '/assets/img/product-1.webp', 'Tương truyền, khi chòm sao Sopdet xuất hiện ở Ai Cập ta, một thiếu nữ hoàng kim tỏa hào quang rực rỡ sẽ hiện thân bên bờ sông Nile...Nàng là con gái nữ thần sông Nile Hapi.Với dung mạo kiều diễm tựa dòng chảy sông Nile, cùng nụ cười mê hoặc lòng người, thiếu nữ do mẹ hiền sông Nile hạ sinh sẽ ban phước lành cho mảnh đất sa mạc của chúng ta...', 0.0, 165, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 10, NULL, NULL, NULL),
(13, 'Một Thư Viện Ở Paris', 141.00, '/assets/img/product-10.webp', 'Dựa trên câu chuyện có thật trong Thế chiến thứ Hai về những thủ thư anh hùng của Thư viện Hoa Kỳ ở Paris, Một thư viện ở Paris của Janet Skeslien Charles kể về một câu chuyện khó quên về tình yêu đầy lãng mạn, tình bạn và gia đình trong tình cảnh bi đát và tăm tối nhất. Cuốn sách xoay quanh người phụ nữ Pháp như Odile. Cô ấy yêu mọi thứ về sách cũng như thư viện. Cô ấy đã ghi nhớ hệ thống Dewey Decimal, thậm chí, cô ấy còn bị mê mẩn cả mùi của những cuốn sách.', 0.0, 184, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 9, NULL, NULL, NULL),
(14, 'Để Đời Không Bốc Hỏa', 119.00, '/assets/img/product-2.webp', 'Với nhiều kiến thức về các huyệt đạo đặc biệt hiệu quả trong việc trừ hỏa từ các cơ quan nội tạng, các chương trình thực hành chữa bệnh và duy trì sức khỏe từ những bậc thầy về y học cổ truyền Trung Hoa, các bữa ăn dễ thực hiện để loại bỏ hỏa, cuốn sách này sẽ giúp bạn điều hòa thể chất và tinh thần, tăng cường sinh lực và thể lực, để đời không bốc hỏa và tràn đầy năng lượng.', 0.0, 178, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 11, NULL, NULL, NULL),
(15, 'Tuyển tập Vũ Trọng Phụng', 121.00, '/assets/img/product-3.webp', 'Cái độc đáo của Vũ Trọng Phụng thì rất nhiều. Ông mất rất sớm nhưng đã để lại 8 tiểu thuyết, 4 phóng sự dài, nhiều bài báo, tiểu luận. Trường hợp đó trong lịch sử NXB Văn Học thế giới rất hiếm. Trong số các tác phẩm đó, tôi thấy Vũ Trọng Phụng có hai tiểu thuyết “Số đỏ” và “Giông tố” là hai tiểu thuyết quan trọng nhất trong lịch sử NXB Văn Học Việt Nam thế kỉ XX.', 1.0, 174, 0, 0, NULL, NULL, 'Vũ Trọng Phụng', 'Bìa mềm', NULL, NULL, 0, 1, 9, NULL, NULL, NULL),
(16, 'Thiên Tài Bên Trái, Kẻ Điên Bên Phải (Tái Bản 2021)', 123.00, '/assets/img/product-4.webp', 'NẾU MỘT NGÀY ANH THẤY TÔI ĐIÊN, THỰC RA CHÍNH LÀ ANH ĐIÊN ĐẤY! Hỡi những con người đang oằn mình trong cuộc sống, bạn biết gì về thế giới của mình? Là vô vàn thứ lý thuyết được các bậc vĩ nhân kiểm chứng, là luật lệ, là cả nghìn thứ sự thật bọc trong cái lốt hiển nhiên, hay những triết lý cứng nhắc của cuộc đời', 0.0, 202, 0, 0, NULL, NULL, 'Cao Minh', 'Bìa mềm', NULL, NULL, 0, 0, 8, NULL, NULL, NULL),
(17, 'Đám Trẻ Ở Đại Dương Đen', 120.00, '/assets/img/product-5.webp', 'Một cuốn sách hấp dẫn về câu chuyện của những đứa trẻ tại Đại Dương Đen.', 0.0, 184, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 5, NULL, NULL, NULL),
(18, 'Suối Cọp', 123.00, '/assets/img/product-6.webp', 'Suối Cọp được viết lên bởi hiện thực và hoàn cảnh chiến tranh đạn bom khốc liệt nằm ở “Hành lang phía Tây” Trường Sơn, nên nó phản ánh một hiện thực vô cùng chân thực, là cuộc sống chiến đấu gian nan, là không tránh khỏi những hy sinh mất mát. Nhưng ở đó có những con người giàu nghĩa tình, những anh hùng trong trận chiến. Đó là những người Đại đội trưởng máu lửa, như Đại đội trưởng Tuần “râu”, Đại đội trưởng Quyết “điên”.', 0.0, 158, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 19, NULL, NULL, NULL),
(19, 'Tết Ở Làng Địa Ngục', 123.00, '/assets/img/product-7.webp', 'Tết ở Làng Địa Ngục xoay quanh câu chuyện về một ngôi làng nhỏ, hẻo lánh mang tên Địa Ngục. Cái tên ám ảnh này đã ám ảnh người dân trong làng từ đời này sang đời khác. Mỗi dịp Tết đến, làng lại chìm vào một không khí u ám, đầy bí ẩn. Những cái chết bất thường, những lời nguyền rủa, những truyền thuyết kỳ bí... tất cả đã tạo nên một bầu không khí căng thẳng, hồi hộp cho câu chuyện.', 0.0, 158, 0, 5, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 6, NULL, NULL, NULL),
(20, 'Big Book - Cuốn Sách Khổng Lồ Về Các Ngôi Sao Và Các Hành Tinh (Tái Bản)', 99.00, '/assets/img/product-8.webp', 'Thì ra, Trái đất chỉ là một hành tinh nhỏ bé trong vũ trụ bao la. Thì ra, Mặt trời là một quả cầu lửa khổng lồ chứa toàn những khí là khí. Thì ra, trong số những ngôi sao tưởng như nhỏ xíu trên bầu trời, có những ngôi sao còn lớn hơn cả Mặt trời... Và còn rất nhiều những chuyện khó tin nữa đang ẩn chứa trong cuốn sách khổng lồ này mà các bạn nhất định không thể bỏ lỡ.', 0.0, 262, 0, 13, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 14, NULL, NULL, NULL),
(21, 'Dấu ấn Hoàng Gia', 123.00, '/assets/img/product-1.webp', 'Tương truyền, khi chòm sao Sopdet xuất hiện ở Ai Cập ta, một thiếu nữ hoàng kim tỏa hào quang rực rỡ sẽ hiện thân bên bờ sông Nile...Nàng là con gái nữ thần sông Nile Hapi.Với dung mạo kiều diễm tựa dòng chảy sông Nile, cùng nụ cười mê hoặc lòng người, thiếu nữ do mẹ hiền sông Nile hạ sinh sẽ ban phước lành cho mảnh đất sa mạc của chúng ta...', 3.7, 201, 0, 17, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 3, 1, NULL, NULL, NULL),
(22, 'Một Thư Viện Ở Paris', 141.00, '/assets/img/product-10.webp', 'Dựa trên câu chuyện có thật trong Thế chiến thứ Hai về những thủ thư anh hùng của Thư viện Hoa Kỳ ở Paris, Một thư viện ở Paris của Janet Skeslien Charles kể về một câu chuyện khó quên về tình yêu đầy lãng mạn, tình bạn và gia đình trong tình cảnh bi đát và tăm tối nhất. Cuốn sách xoay quanh người phụ nữ Pháp như Odile. Cô ấy yêu mọi thứ về sách cũng như thư viện. Cô ấy đã ghi nhớ hệ thống Dewey Decimal, thậm chí, cô ấy còn bị mê mẩn cả mùi của những cuốn sách.', 0.0, 185, 0, 5, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text DEFAULT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'string',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `key`, `value`, `type`, `created_at`, `updated_at`) VALUES
(1, 'store.name', 'BookStore', 'string', '2025-11-18 05:04:54', '2025-11-18 05:10:34'),
(2, 'store.slogan', 'Mỗi cuốn sách hay là một người bạn tốt', 'string', '2025-11-18 05:04:54', '2025-11-18 05:10:34'),
(3, 'store.hotline', '1900 1111', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(4, 'store.email', 'BookStore@gmail.com', 'string', '2025-11-18 05:04:54', '2025-11-18 05:10:34'),
(5, 'store.address', '123 Lê Lợi, Quận 1, TP HCM', 'string', '2025-11-18 05:04:54', '2025-11-18 05:10:34'),
(6, 'store.working_hours', '', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(7, 'store.description', 'BookStore.com nhận đặt hàng trực tuyến và giao hàng tận nơi.', 'string', '2025-11-18 05:04:54', '2025-11-18 05:11:15'),
(8, 'social.facebook', '', 'string', '2025-11-18 05:04:54', '2025-11-18 11:58:05'),
(9, 'social.instagram', '', 'string', '2025-11-18 05:04:54', '2025-11-18 11:58:05'),
(10, 'social.youtube', '', 'string', '2025-11-18 05:04:54', '2025-11-18 11:58:05'),
(11, 'social.tiktok', '', 'string', '2025-11-18 05:04:54', '2025-11-18 11:58:05'),
(12, 'social.zalo', '', 'string', '2025-11-18 05:04:54', '2025-11-18 11:58:05'),
(13, 'shipping.fee', '', 'number', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(14, 'shipping.free_threshold', '', 'number', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(15, 'shipping.delivery_days', '', 'number', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(16, 'shipping.areas', '', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(17, 'promo.bulk_discount', '10', 'number', '2025-11-18 05:04:54', '2025-11-18 05:37:56'),
(18, 'promo.bulk_threshold', '', 'number', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(19, 'promo.enable_voucher', 'true', 'bool', '2025-11-18 05:04:54', '2025-11-18 08:33:27'),
(20, 'promo.enable_flashsale', 'true', 'bool', '2025-11-18 05:04:54', '2025-11-18 08:33:27'),
(21, 'display.products_per_page', '3', 'number', '2025-11-18 05:04:54', '2025-11-18 05:47:33'),
(22, 'format.timezone', '', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(23, 'format.currency', 'VND', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(24, 'format.decimals', '0', 'number', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(25, 'display.show_rating', 'false', 'bool', '2025-11-18 05:04:54', '2025-11-18 05:48:30'),
(26, 'display.show_sold', 'false', 'bool', '2025-11-18 05:04:54', '2025-11-18 05:48:30'),
(27, 'smtp.host', '', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(28, 'smtp.port', '', 'number', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(29, 'smtp.user', '', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(30, 'smtp.pass', '', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(31, 'email.notify_order', 'false', 'bool', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(32, 'email.notify_promo', 'false', 'bool', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(33, 'payment.sandbox', 'false', 'bool', '2025-11-18 05:04:54', '2025-11-18 07:59:24'),
(34, 'payment.enable_cod', 'true', 'bool', '2025-11-18 05:04:54', '2025-11-18 08:34:25'),
(35, 'payment.enable_bank', 'true', 'bool', '2025-11-18 05:04:54', '2025-11-18 08:34:25'),
(36, 'payment.enable_ewallet', 'true', 'bool', '2025-11-18 05:04:54', '2025-11-18 08:34:25'),
(37, 'payment.bank_info', '', 'string', '2025-11-18 05:04:54', '2025-11-18 05:04:54'),
(38, 'inventory.low_threshold', '2', 'number', '2025-11-18 05:04:54', '2025-11-18 06:01:13'),
(39, 'inventory.auto_hide', 'false', 'bool', '2025-11-18 05:04:54', '2025-11-18 07:59:24'),
(40, 'policy.warranty', 'test1', 'string', '2025-11-18 05:04:54', '2025-11-18 06:00:13'),
(41, 'policy.return', 'test2', 'string', '2025-11-18 05:04:54', '2025-11-18 06:00:13'),
(42, 'policy.shipping', 'test3', 'string', '2025-11-18 05:04:54', '2025-11-18 06:00:13');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(200) NOT NULL,
  `password` varchar(200) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `birthday` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `password`, `created_at`, `role`, `status`, `birthday`) VALUES
(1, 'user1@gmail.com', '$2a$10$7Knog3mf40UU1zFxgtUN7.QEtbI8PKF3MB3kvFkCOZRPRRJXhCR86', '2025-11-18 19:19:30', 'user', 'active', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_vouchers`
--

CREATE TABLE `user_vouchers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `voucher_id` int(11) NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `received_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `used_at` datetime DEFAULT NULL,
  `origin` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_vouchers`
--

INSERT INTO `user_vouchers` (`id`, `user_id`, `voucher_id`, `is_used`, `received_at`, `used_at`, `origin`) VALUES
(5, 1, 1, 0, '2025-11-18 12:19:30', NULL, 'auto-signup'),
(6, 1, 2, 0, '2025-11-18 12:23:17', NULL, 'auto-first_order'),
(7, 1, 3, 0, '2025-11-18 12:23:19', NULL, 'auto-spend_500k');

-- --------------------------------------------------------

--
-- Table structure for table `vouchers`
--

CREATE TABLE `vouchers` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `discount_type` enum('percent','fixed') NOT NULL DEFAULT 'percent',
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_amount` decimal(10,2) DEFAULT 0.00,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `used_count` int(11) DEFAULT 0,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `quantity` int(11) DEFAULT NULL,
  `claimed_count` int(11) DEFAULT 0,
  `name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `auto_tag` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vouchers`
--

INSERT INTO `vouchers` (`id`, `code`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount`, `usage_limit`, `used_count`, `start_date`, `end_date`, `is_active`, `created_at`, `updated_at`, `quantity`, `claimed_count`, `name`, `description`, `auto_tag`) VALUES
(1, 'WELCOME20K', 'fixed', 20000.00, 150000.00, NULL, NULL, 0, NULL, NULL, 1, '2025-11-18 08:31:02', '2025-11-18 08:31:02', NULL, 0, 'Voucher chào mừng', 'Giảm 20.000 ₫ cho đơn hàng từ 150.000 ₫', 'signup'),
(2, 'FIRSTORDER15K', 'fixed', 15000.00, 100000.00, NULL, NULL, 0, NULL, NULL, 1, '2025-11-18 08:37:55', '2025-11-18 12:23:17', NULL, 1, 'Ưu đãi đơn đầu tiên', 'Giảm 15.000 ₫ khi hoàn tất đơn đầu tiên', 'first_order'),
(3, 'BIGSPENDER50K', 'fixed', 50000.00, 200000.00, NULL, NULL, 0, NULL, NULL, 1, '2025-11-18 08:37:55', '2025-11-18 12:23:19', NULL, 1, 'Tri ân khách chi tiêu 500K', 'Giảm 50.000 ₫ khi tổng chi tiêu đạt 500.000 ₫', 'spend_500k');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orders_user` (`user_id`);

--
-- Indexes for table `party`
--
ALTER TABLE `party`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_vouchers`
--
ALTER TABLE `user_vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_voucher` (`user_id`,`voucher_id`),
  ADD KEY `fk_uv_voucher` (`voucher_id`);

--
-- Indexes for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `party`
--
ALTER TABLE `party`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=871;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `user_vouchers`
--
ALTER TABLE `user_vouchers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `vouchers`
--
ALTER TABLE `vouchers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `user_vouchers`
--
ALTER TABLE `user_vouchers`
  ADD CONSTRAINT `fk_uv_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_uv_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
