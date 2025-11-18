import React, { Fragment } from "react";

function Banner() {
    return (
        <Fragment>
            <div style={{ height: '410px', overflow: 'hidden' }}>
                <img className="img-fluid banner-img" src="assets/img/carousel-1.jpg" alt="Banner cửa hàng sách" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
        </Fragment>
    )
}

export default Banner;