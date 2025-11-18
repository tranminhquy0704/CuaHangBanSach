-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 15, 2025 at 11:41 AM
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
  `status` enum('pending','processing','completed','cancelled') NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `fullName`, `email`, `mobile`, `address`, `state`, `paymentMethod`, `total`, `createdAt`, `cartItems`, `user_id`, `created_at`, `status`) VALUES
(1, 'Test user1', '', '0358134836', 'tl02', 'Hồ Chí Minh', 'banktransfer', 367000.00, '2025-11-15 09:58:30', '[{\"id\":2,\"name\":\"Tuyển tập Vũ Trọng Phụng\",\"price\":\"121.00\",\"img\":\"/assets/img/product-3.webp\",\"description\":\"Cái độc đáo của Vũ Trọng Phụng...\",\"rating\":\"5.0\",\"sold\":165,\"sale_total\":0,\"sale_sold\":30,\"supplier\":\"NXB Văn Học\",\"publisher\":\"Văn Học\",\"author\":\"Vũ Trọng Phụng\",\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":1,\"stock\":6,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1},{\"id\":3,\"name\":\"Thiên Tài Bên Trái, Kẻ Điên Bên Phải\",\"price\":\"123.00\",\"img\":\"/assets/img/product-4.webp\",\"description\":\"NẾU MỘT NGÀY ANH THẤY TÔI ĐIÊN...\",\"rating\":\"0.0\",\"sold\":129,\"sale_total\":0,\"sale_sold\":7,\"supplier\":\"NXB Thế Giới\",\"publisher\":\"Thế Giới\",\"author\":\"Cao Minh\",\"coverType\":\"Bìa mềm\",\"discount\":10,\"oldPrice\":\"136.67\",\"isNew\":0,\"rating_count\":0,\"stock\":7,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1},{\"id\":4,\"name\":\"Suối Cọp\",\"price\":\"123.00\",\"img\":\"/assets/img/product-6.webp\",\"description\":\"Suối Cọp được viết...\",\"rating\":\"0.0\",\"sold\":117,\"sale_total\":500,\"sale_sold\":125,\"supplier\":\"NXB Trẻ\",\"publisher\":\"Trẻ\",\"author\":\"Nhiều tác giả\",\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":0,\"stock\":10,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1}]', 1, '2025-11-15 16:58:30', ''),
(2, 'Test user2', '', '0358134836', 'tl02', 'Hồ Chí Minh', 'banktransfer', 338000.00, '2025-11-15 09:59:26', '[{\"id\":1,\"name\":\"Để Đời Không Bốc Hỏa\",\"price\":\"119.00\",\"img\":\"/assets/img/product-2.webp\",\"description\":\"Với nhiều kiến thức về các huyệt đạo...\",\"rating\":\"0.0\",\"sold\":148,\"sale_total\":1000,\"sale_sold\":366,\"supplier\":\"NXB Kim Đồng\",\"publisher\":\"Kim Đồng\",\"author\":\"Nhiều tác giả\",\"coverType\":\"Bìa mềm\",\"discount\":20,\"oldPrice\":\"148.75\",\"isNew\":1,\"rating_count\":0,\"stock\":15,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1},{\"id\":8,\"name\":\"Đám Trẻ Ở Đại Dương Đen\",\"price\":\"120.00\",\"img\":\"/assets/img/product-5.webp\",\"description\":\"Một cuốn sách hấp dẫn về câu chuyện của những đứa trẻ tại Đại Dương Đen.\",\"rating\":\"4.0\",\"sold\":106,\"sale_total\":0,\"sale_sold\":4,\"supplier\":null,\"publisher\":null,\"author\":null,\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":1,\"stock\":5,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1},{\"id\":11,\"name\":\"Big Book - Cuốn Sách Khổng Lồ Về Các Ngôi Sao Và Các Hành Tinh (Tái Bản)\",\"price\":\"99.00\",\"img\":\"/assets/img/product-8.webp\",\"description\":\"Thì ra, Trái đất chỉ là một hành tinh nhỏ bé trong vũ trụ bao la. Thì ra, Mặt trời là một quả cầu lửa khổng lồ chứa toàn những khí là khí. Thì ra, trong số những ngôi sao tưởng như nhỏ xíu trên bầu trời, có những ngôi sao còn lớn hơn cả Mặt trời... Và còn rất nhiều những chuyện khó tin nữa đang ẩn chứa trong cuốn sách khổng lồ này mà các bạn nhất định không thể bỏ lỡ.\",\"rating\":\"0.0\",\"sold\":110,\"sale_total\":0,\"sale_sold\":0,\"supplier\":null,\"publisher\":null,\"author\":null,\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":0,\"stock\":12,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1}]', 2, '2025-11-15 16:59:26', ''),
(3, 'Test user1', '', '0358134836', 'tl02', 'Hồ Chí Minh', 'banktransfer', 119000.00, '2025-11-15 09:59:55', '[{\"id\":5,\"name\":\"Để Đời Không Bốc Hỏa\",\"price\":\"119.00\",\"img\":\"/assets/img/product-2.webp\",\"description\":\"Với nhiều kiến thức về các huyệt đạo đặc biệt hiệu quả trong việc trừ hỏa từ các cơ quan nội tạng, các chương trình thực hành chữa bệnh và duy trì sức khỏe từ những bậc thầy về y học cổ truyền Trung Hoa, các bữa ăn dễ thực hiện để loại bỏ hỏa, cuốn sách này sẽ giúp bạn điều hòa thể chất và tinh thần, tăng cường sinh lực và thể lực, để đời không bốc hỏa và tràn đầy năng lượng.\",\"rating\":\"0.0\",\"sold\":129,\"sale_total\":0,\"sale_sold\":12,\"supplier\":null,\"publisher\":null,\"author\":null,\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":0,\"stock\":9,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1}]', 2, '2025-11-15 16:59:55', ''),
(4, 'Test user1', '', '0358134836', 'tl02', 'Hồ Chí Minh', 'banktransfer', 123000.00, '2025-11-15 10:00:10', '[{\"id\":4,\"name\":\"Suối Cọp\",\"price\":\"123.00\",\"img\":\"/assets/img/product-6.webp\",\"description\":\"Suối Cọp được viết...\",\"rating\":\"0.0\",\"sold\":118,\"sale_total\":500,\"sale_sold\":126,\"supplier\":\"NXB Trẻ\",\"publisher\":\"Trẻ\",\"author\":\"Nhiều tác giả\",\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":0,\"stock\":10,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1}]', 2, '2025-11-15 17:00:10', ''),
(5, 'Test user1', '', '0358134836', 'tl02', 'Hồ Chí Minh', 'banktransfer', 119000.00, '2025-11-15 10:00:23', '[{\"id\":5,\"name\":\"Để Đời Không Bốc Hỏa\",\"price\":\"119.00\",\"img\":\"/assets/img/product-2.webp\",\"description\":\"Với nhiều kiến thức về các huyệt đạo đặc biệt hiệu quả trong việc trừ hỏa từ các cơ quan nội tạng, các chương trình thực hành chữa bệnh và duy trì sức khỏe từ những bậc thầy về y học cổ truyền Trung Hoa, các bữa ăn dễ thực hiện để loại bỏ hỏa, cuốn sách này sẽ giúp bạn điều hòa thể chất và tinh thần, tăng cường sinh lực và thể lực, để đời không bốc hỏa và tràn đầy năng lượng.\",\"rating\":\"0.0\",\"sold\":130,\"sale_total\":0,\"sale_sold\":13,\"supplier\":null,\"publisher\":null,\"author\":null,\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":0,\"stock\":9,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1}]', 2, '2025-11-15 17:00:23', ''),
(6, 'Test user1', '', '0358134836', 'tl02', 'Hồ Chí Minh', 'banktransfer', 222000.00, '2025-11-15 10:26:58', '[{\"id\":21,\"name\":\"Dấu ấn Hoàng Gia\",\"price\":\"123.00\",\"img\":\"/assets/img/product-1.webp\",\"description\":\"Tương truyền, khi chòm sao Sopdet xuất hiện ở Ai Cập ta, một thiếu nữ hoàng kim tỏa hào quang rực rỡ sẽ hiện thân bên bờ sông Nile...Nàng là con gái nữ thần sông Nile Hapi.Với dung mạo kiều diễm tựa dòng chảy sông Nile, cùng nụ cười mê hoặc lòng người, thiếu nữ do mẹ hiền sông Nile hạ sinh sẽ ban phước lành cho mảnh đất sa mạc của chúng ta...\",\"rating\":\"3.7\",\"sold\":121,\"sale_total\":0,\"sale_sold\":0,\"supplier\":null,\"publisher\":null,\"author\":null,\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":3,\"stock\":11,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1},{\"id\":20,\"name\":\"Big Book - Cuốn Sách Khổng Lồ Về Các Ngôi Sao Và Các Hành Tinh (Tái Bản)\",\"price\":\"99.00\",\"img\":\"/assets/img/product-8.webp\",\"description\":\"Thì ra, Trái đất chỉ là một hành tinh nhỏ bé trong vũ trụ bao la. Thì ra, Mặt trời là một quả cầu lửa khổng lồ chứa toàn những khí là khí. Thì ra, trong số những ngôi sao tưởng như nhỏ xíu trên bầu trời, có những ngôi sao còn lớn hơn cả Mặt trời... Và còn rất nhiều những chuyện khó tin nữa đang ẩn chứa trong cuốn sách khổng lồ này mà các bạn nhất định không thể bỏ lỡ.\",\"rating\":\"0.0\",\"sold\":163,\"sale_total\":0,\"sale_sold\":0,\"supplier\":null,\"publisher\":null,\"author\":null,\"coverType\":\"Bìa mềm\",\"discount\":null,\"oldPrice\":null,\"isNew\":0,\"rating_count\":0,\"stock\":14,\"category_id\":null,\"publisher_id\":null,\"author_id\":null,\"quantity\":1}]', 2, '2025-11-15 17:26:58', 'pending');

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
(1, 'Để Đời Không Bốc Hỏa', 119.00, '/assets/img/product-2.webp', 'Với nhiều kiến thức về các huyệt đạo...', 0.0, 149, 1000, 367, 'NXB Kim Đồng', 'Kim Đồng', 'Nhiều tác giả', 'Bìa mềm', 20, 148.75, 1, 0, 15, NULL, NULL, NULL),
(2, 'Tuyển tập Vũ Trọng Phụng', 121.00, '/assets/img/product-3.webp', 'Cái độc đáo của Vũ Trọng Phụng...', 5.0, 166, 0, 31, 'NXB Văn Học', 'Văn Học', 'Vũ Trọng Phụng', 'Bìa mềm', NULL, NULL, 0, 1, 6, NULL, NULL, NULL),
(3, 'Thiên Tài Bên Trái, Kẻ Điên Bên Phải', 123.00, '/assets/img/product-4.webp', 'NẾU MỘT NGÀY ANH THẤY TÔI ĐIÊN...', 0.0, 130, 0, 8, 'NXB Thế Giới', 'Thế Giới', 'Cao Minh', 'Bìa mềm', 10, 136.67, 0, 0, 7, NULL, NULL, NULL),
(4, 'Suối Cọp', 123.00, '/assets/img/product-6.webp', 'Suối Cọp được viết...', 0.0, 119, 500, 127, 'NXB Trẻ', 'Trẻ', 'Nhiều tác giả', 'Bìa mềm', NULL, NULL, 0, 0, 10, NULL, NULL, NULL),
(5, 'Để Đời Không Bốc Hỏa', 119.00, '/assets/img/product-2.webp', 'Với nhiều kiến thức về các huyệt đạo đặc biệt hiệu quả trong việc trừ hỏa từ các cơ quan nội tạng, các chương trình thực hành chữa bệnh và duy trì sức khỏe từ những bậc thầy về y học cổ truyền Trung Hoa, các bữa ăn dễ thực hiện để loại bỏ hỏa, cuốn sách này sẽ giúp bạn điều hòa thể chất và tinh thần, tăng cường sinh lực và thể lực, để đời không bốc hỏa và tràn đầy năng lượng.', 0.0, 131, 0, 14, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 9, NULL, NULL, NULL),
(6, 'Tuyển tập Vũ Trọng Phụng', 121.00, '/assets/img/product-3.webp', 'Cái độc đáo của Vũ Trọng Phụng thì rất nhiều. Ông mất rất sớm nhưng đã để lại 8 tiểu thuyết, 4 phóng sự dài, nhiều bài báo, tiểu luận. Trường hợp đó trong lịch sử NXB Văn Học thế giới rất hiếm. Trong số các tác phẩm đó, tôi thấy Vũ Trọng Phụng có hai tiểu thuyết “Số đỏ” và “Giông tố” là hai tiểu thuyết quan trọng nhất trong lịch sử NXB Văn Học Việt Nam thế kỉ XX.', 0.0, 123, 0, 4, NULL, NULL, 'Vũ Trọng Phụng', 'Bìa mềm', NULL, NULL, 0, 0, 7, NULL, NULL, NULL),
(7, 'Thiên Tài Bên Trái, Kẻ Điên Bên Phải (Tái Bản 2021)', 123.00, '/assets/img/product-4.webp', 'NẾU MỘT NGÀY ANH THẤY TÔI ĐIÊN, THỰC RA CHÍNH LÀ ANH ĐIÊN ĐẤY! Hỡi những con người đang oằn mình trong cuộc sống, bạn biết gì về thế giới của mình? Là vô vàn thứ lý thuyết được các bậc vĩ nhân kiểm chứng, là luật lệ, là cả nghìn thứ sự thật bọc trong cái lốt hiển nhiên, hay những triết lý cứng nhắc của cuộc đời', 5.0, 123, 0, 1, NULL, NULL, 'Cao Minh', 'Bìa mềm', NULL, NULL, 0, 1, 7, NULL, NULL, NULL),
(8, 'Đám Trẻ Ở Đại Dương Đen', 120.00, '/assets/img/product-5.webp', 'Một cuốn sách hấp dẫn về câu chuyện của những đứa trẻ tại Đại Dương Đen.', 4.0, 107, 0, 5, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 1, 5, NULL, NULL, NULL),
(9, 'Suối Cọp', 123.00, '/assets/img/product-6.webp', 'Suối Cọp được viết lên bởi hiện thực và hoàn cảnh chiến tranh đạn bom khốc liệt nằm ở “Hành lang phía Tây” Trường Sơn, nên nó phản ánh một hiện thực vô cùng chân thực, là cuộc sống chiến đấu gian nan, là không tránh khỏi những hy sinh mất mát. Nhưng ở đó có những con người giàu nghĩa tình, những anh hùng trong trận chiến. Đó là những người Đại đội trưởng máu lửa, như Đại đội trưởng Tuần “râu”, Đại đội trưởng Quyết “điên”.', 0.0, 111, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 2, NULL, NULL, NULL),
(10, 'Tết Ở Làng Địa Ngục', 123.00, '/assets/img/product-7.webp', 'Tết ở Làng Địa Ngục xoay quanh câu chuyện về một ngôi làng nhỏ, hẻo lánh mang tên Địa Ngục. Cái tên ám ảnh này đã ám ảnh người dân trong làng từ đời này sang đời khác. Mỗi dịp Tết đến, làng lại chìm vào một không khí u ám, đầy bí ẩn. Những cái chết bất thường, những lời nguyền rủa, những truyền thuyết kỳ bí... tất cả đã tạo nên một bầu không khí căng thẳng, hồi hộp cho câu chuyện.', 0.0, 140, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 5, NULL, NULL, NULL),
(11, 'Big Book - Cuốn Sách Khổng Lồ Về Các Ngôi Sao Và Các Hành Tinh (Tái Bản)', 99.00, '/assets/img/product-8.webp', 'Thì ra, Trái đất chỉ là một hành tinh nhỏ bé trong vũ trụ bao la. Thì ra, Mặt trời là một quả cầu lửa khổng lồ chứa toàn những khí là khí. Thì ra, trong số những ngôi sao tưởng như nhỏ xíu trên bầu trời, có những ngôi sao còn lớn hơn cả Mặt trời... Và còn rất nhiều những chuyện khó tin nữa đang ẩn chứa trong cuốn sách khổng lồ này mà các bạn nhất định không thể bỏ lỡ.', 0.0, 111, 0, 1, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 12, NULL, NULL, NULL),
(12, 'Dấu ấn Hoàng Gia', 123.00, '/assets/img/product-1.webp', 'Tương truyền, khi chòm sao Sopdet xuất hiện ở Ai Cập ta, một thiếu nữ hoàng kim tỏa hào quang rực rỡ sẽ hiện thân bên bờ sông Nile...Nàng là con gái nữ thần sông Nile Hapi.Với dung mạo kiều diễm tựa dòng chảy sông Nile, cùng nụ cười mê hoặc lòng người, thiếu nữ do mẹ hiền sông Nile hạ sinh sẽ ban phước lành cho mảnh đất sa mạc của chúng ta...', 0.0, 109, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 10, NULL, NULL, NULL),
(13, 'Một Thư Viện Ở Paris', 141.00, '/assets/img/product-10.webp', 'Dựa trên câu chuyện có thật trong Thế chiến thứ Hai về những thủ thư anh hùng của Thư viện Hoa Kỳ ở Paris, Một thư viện ở Paris của Janet Skeslien Charles kể về một câu chuyện khó quên về tình yêu đầy lãng mạn, tình bạn và gia đình trong tình cảnh bi đát và tăm tối nhất. Cuốn sách xoay quanh người phụ nữ Pháp như Odile. Cô ấy yêu mọi thứ về sách cũng như thư viện. Cô ấy đã ghi nhớ hệ thống Dewey Decimal, thậm chí, cô ấy còn bị mê mẩn cả mùi của những cuốn sách.', 0.0, 129, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 9, NULL, NULL, NULL),
(14, 'Để Đời Không Bốc Hỏa', 119.00, '/assets/img/product-2.webp', 'Với nhiều kiến thức về các huyệt đạo đặc biệt hiệu quả trong việc trừ hỏa từ các cơ quan nội tạng, các chương trình thực hành chữa bệnh và duy trì sức khỏe từ những bậc thầy về y học cổ truyền Trung Hoa, các bữa ăn dễ thực hiện để loại bỏ hỏa, cuốn sách này sẽ giúp bạn điều hòa thể chất và tinh thần, tăng cường sinh lực và thể lực, để đời không bốc hỏa và tràn đầy năng lượng.', 0.0, 133, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 11, NULL, NULL, NULL),
(15, 'Tuyển tập Vũ Trọng Phụng', 121.00, '/assets/img/product-3.webp', 'Cái độc đáo của Vũ Trọng Phụng thì rất nhiều. Ông mất rất sớm nhưng đã để lại 8 tiểu thuyết, 4 phóng sự dài, nhiều bài báo, tiểu luận. Trường hợp đó trong lịch sử NXB Văn Học thế giới rất hiếm. Trong số các tác phẩm đó, tôi thấy Vũ Trọng Phụng có hai tiểu thuyết “Số đỏ” và “Giông tố” là hai tiểu thuyết quan trọng nhất trong lịch sử NXB Văn Học Việt Nam thế kỉ XX.', 1.0, 130, 0, 0, NULL, NULL, 'Vũ Trọng Phụng', 'Bìa mềm', NULL, NULL, 0, 1, 9, NULL, NULL, NULL),
(16, 'Thiên Tài Bên Trái, Kẻ Điên Bên Phải (Tái Bản 2021)', 123.00, '/assets/img/product-4.webp', 'NẾU MỘT NGÀY ANH THẤY TÔI ĐIÊN, THỰC RA CHÍNH LÀ ANH ĐIÊN ĐẤY! Hỡi những con người đang oằn mình trong cuộc sống, bạn biết gì về thế giới của mình? Là vô vàn thứ lý thuyết được các bậc vĩ nhân kiểm chứng, là luật lệ, là cả nghìn thứ sự thật bọc trong cái lốt hiển nhiên, hay những triết lý cứng nhắc của cuộc đời', 0.0, 146, 0, 0, NULL, NULL, 'Cao Minh', 'Bìa mềm', NULL, NULL, 0, 0, 8, NULL, NULL, NULL),
(17, 'Đám Trẻ Ở Đại Dương Đen', 120.00, '/assets/img/product-5.webp', 'Một cuốn sách hấp dẫn về câu chuyện của những đứa trẻ tại Đại Dương Đen.', 0.0, 133, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 5, NULL, NULL, NULL),
(18, 'Suối Cọp', 123.00, '/assets/img/product-6.webp', 'Suối Cọp được viết lên bởi hiện thực và hoàn cảnh chiến tranh đạn bom khốc liệt nằm ở “Hành lang phía Tây” Trường Sơn, nên nó phản ánh một hiện thực vô cùng chân thực, là cuộc sống chiến đấu gian nan, là không tránh khỏi những hy sinh mất mát. Nhưng ở đó có những con người giàu nghĩa tình, những anh hùng trong trận chiến. Đó là những người Đại đội trưởng máu lửa, như Đại đội trưởng Tuần “râu”, Đại đội trưởng Quyết “điên”.', 0.0, 106, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 19, NULL, NULL, NULL),
(19, 'Tết Ở Làng Địa Ngục', 123.00, '/assets/img/product-7.webp', 'Tết ở Làng Địa Ngục xoay quanh câu chuyện về một ngôi làng nhỏ, hẻo lánh mang tên Địa Ngục. Cái tên ám ảnh này đã ám ảnh người dân trong làng từ đời này sang đời khác. Mỗi dịp Tết đến, làng lại chìm vào một không khí u ám, đầy bí ẩn. Những cái chết bất thường, những lời nguyền rủa, những truyền thuyết kỳ bí... tất cả đã tạo nên một bầu không khí căng thẳng, hồi hộp cho câu chuyện.', 0.0, 124, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 6, NULL, NULL, NULL),
(20, 'Big Book - Cuốn Sách Khổng Lồ Về Các Ngôi Sao Và Các Hành Tinh (Tái Bản)', 99.00, '/assets/img/product-8.webp', 'Thì ra, Trái đất chỉ là một hành tinh nhỏ bé trong vũ trụ bao la. Thì ra, Mặt trời là một quả cầu lửa khổng lồ chứa toàn những khí là khí. Thì ra, trong số những ngôi sao tưởng như nhỏ xíu trên bầu trời, có những ngôi sao còn lớn hơn cả Mặt trời... Và còn rất nhiều những chuyện khó tin nữa đang ẩn chứa trong cuốn sách khổng lồ này mà các bạn nhất định không thể bỏ lỡ.', 0.0, 164, 0, 1, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 14, NULL, NULL, NULL),
(21, 'Dấu ấn Hoàng Gia', 123.00, '/assets/img/product-1.webp', 'Tương truyền, khi chòm sao Sopdet xuất hiện ở Ai Cập ta, một thiếu nữ hoàng kim tỏa hào quang rực rỡ sẽ hiện thân bên bờ sông Nile...Nàng là con gái nữ thần sông Nile Hapi.Với dung mạo kiều diễm tựa dòng chảy sông Nile, cùng nụ cười mê hoặc lòng người, thiếu nữ do mẹ hiền sông Nile hạ sinh sẽ ban phước lành cho mảnh đất sa mạc của chúng ta...', 3.7, 122, 0, 1, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 3, 11, NULL, NULL, NULL),
(22, 'Một Thư Viện Ở Paris', 141.00, '/assets/img/product-10.webp', 'Dựa trên câu chuyện có thật trong Thế chiến thứ Hai về những thủ thư anh hùng của Thư viện Hoa Kỳ ở Paris, Một thư viện ở Paris của Janet Skeslien Charles kể về một câu chuyện khó quên về tình yêu đầy lãng mạn, tình bạn và gia đình trong tình cảnh bi đát và tăm tối nhất. Cuốn sách xoay quanh người phụ nữ Pháp như Odile. Cô ấy yêu mọi thứ về sách cũng như thư viện. Cô ấy đã ghi nhớ hệ thống Dewey Decimal, thậm chí, cô ấy còn bị mê mẩn cả mùi của những cuốn sách.', 0.0, 117, 0, 0, NULL, NULL, NULL, 'Bìa mềm', NULL, NULL, 0, 0, 14, NULL, NULL, NULL);

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
  `status` varchar(20) NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `password`, `created_at`, `role`, `status`) VALUES
(1, 'user1@gmail.com', '$2a$10$rE1Ux63s4hnmpOMDjeAZ6.n.4if.OaIxmQijRMvQfdDZcC.A1Fyzm', '2025-11-15 16:44:36', 'user', 'active'),
(2, 'user2', '$2a$10$9yIuI6QoqosDewWlMgrQ5ewd6MyUhhaz66ZKxkgKmquT6gA96NdhK', '2025-11-15 16:45:12', 'user', 'active');

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
