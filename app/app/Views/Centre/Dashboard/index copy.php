<div class="row g-4 mb-4"> <!-- Main row with consistent gap -->
    <!-- Welcome Card (takes 7 columns on md+, full width on mobile) -->
    <div class="col-md-8 col-12">
        <div class="card h-100"> <!-- Added h-100 for equal height -->
            <div class="card-body bg-marketplace d-flex flex-column flex-md-row h-100">
                <div class="flex-grow-1">
                    <h4 class="fs-20 lh-base mt-3">Hello <span class="text-success"><?= get_user_name() ?></span></h4>
                    <p class="mb-0 mt-2 pt-1 text-muted">
                        <?php
                        $hour = date('H');
                        echo ($hour < 12) ? "Good morning!" : (($hour < 18) ? "Good afternoon!" : "Good evening!");
                        ?>
                    </p>
                    <div class="d-flex flex-wrap gap-3 mt-4">
                        <a href="<?= base_url('app/application/index') ?>" class="btn btn-primary">Add Application</a>
                        <a href="<?= base_url('app/course/index') ?>" class="btn btn-success">Explore Courses</a>
                    </div>
                </div>
                <img src="<?= base_url() ?>assets/app/images/bg-d.png" alt="" class="img-fluid d-none d-md-block" />
            </div>
        </div>
    </div>

    <!-- Counter Cards (each takes 2 columns on md+, half width on mobile) -->
    <div class="col-md-2 col-6">
        <div class="card card-animate h-100">
            <div class="card-body">
                <div class="text-center mt-2"> <!-- Center-align all content -->
                    <!-- Logo (Centered) -->
                    <div class="avatar-md d-inline-flex justify-content-center align-items-center mb-3">
                        <span class="avatar-title bg-info-subtle rounded-circle fs-2">
                            <i data-feather="users" class="text-info"></i>
                        </span>
                    </div>
                </div>
                <!-- Text (Increased size + centered) -->
                <p class="fw-medium text-muted fs-5 mb-1 mt-2">Students</p> <!-- fs-5 = larger text -->
                <p class="fw-medium text-muted fs-5 mb-3">Count</p> <!-- mb-3 = spacing -->

                <!-- Number (Larger size) -->
                <h2 class="ff-secondary fw-semibold mb-0">
                    <span class="counter-value fs-1" data-target="235">0</span> <!-- fs-1 = very large -->
                </h2>
            </div>
        </div>
    </div>
    <div class="col-md-2 col-6">
        <div class="card card-animate h-100">
            <div class="card-body">
                <div class="text-center mt-2"> <!-- Center-align all content -->
                    <!-- Logo (Centered) -->
                    <div class="avatar-md d-inline-flex justify-content-center align-items-center mb-3">
                        <span class="avatar-title bg-info-subtle rounded-circle fs-2">
                            <i data-feather="home" class="text-info"></i>
                        </span>
                    </div>
                </div>
                <!-- Text (Increased size + centered) -->
                <p class="fw-medium text-muted fs-5 mb-1 mt-2">Centres</p> <!-- fs-5 = larger text -->
                <p class="fw-medium text-muted fs-5 mb-3">Count</p> <!-- mb-3 = spacing -->

                <!-- Number (Larger size) -->
                <h2 class="ff-secondary fw-semibold mb-0">
                    <span class="counter-value fs-1" data-target="23">0</span> <!-- fs-1 = very large -->
                </h2>
            </div>
        </div>
    </div>

    
</div>

<div class="row">

      <div class="col-xl-4">
        <!-- card -->
        <div class="card card-height-100">
            <div class="card-header align-items-center d-flex">
                <h4 class="card-title mb-0 flex-grow-1">Students by Locations</h4>
            </div><!-- end card header -->

            <!-- card body -->
            <div class="card-body">

                <div id="students-by-locations" data-colors='["--vz-light"]' style="height: 269px">
                </div>

                <div class="px-2 py-2 mt-1">
                    <p class="mb-1">India<span class="float-end">100%</span></p>
                    <div class="progress mt-2 bg-primary-subtle" style="height: 6px;">
                        <div class="progress-bar progress-bar-striped bg-primary" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            <!-- end card body -->
        </div>
        <!-- end card -->
    </div>
    
    <div class="col-xl-4">
        <div class="card card-height-100">
            <div class="card-header align-items-center d-flex">
                <h4 class="card-title mb-0 flex-grow-1">Sessions by Countries (working)</h4>
            </div>
            <div class="card-body p-0">
                <div>
                    <div id="countries_charts" data-colors='["--vz-info", "--vz-info", "--vz-info", "--vz-info", "--vz-danger", "--vz-info", "--vz-info", "--vz-info", "--vz-info", "--vz-info"]' class="apex-charts" dir="ltr"></div>
                </div>
            </div><!-- end card body -->
        </div><!-- end card -->
    </div>

    <div class="col-xl-4">
        <div class="card card-height-100">
            <div class="card-header align-items-center d-flex">
                <h4 class="card-title mb-0 flex-grow-1">Referral Admissions (working)</h4>
            </div>

            <div class="card-body">

                <div class="row align-items-center">
                    <div class="col-6">
                        <h6 class="text-muted text-uppercase fw-semibold text-truncate fs-12 mb-3">
                            Total Referrals Page</h6>
                        <h4 class="fs- mb-0">725,800</h4>
                        <p class="mb-0 mt-2 text-muted"><span class="badge bg-success-subtle text-success mb-0">
                                <i class="ri-arrow-up-line align-middle"></i> 15.72 %
                            </span> vs. previous month</p>
                    </div><!-- end col -->
                    <div class="col-6">
                        <div class="text-center">
                            <img src="assets/images/illustrator-1.png" class="img-fluid" alt="">
                        </div>
                    </div><!-- end col -->
                </div><!-- end row -->
                <div class="mt-3 pt-2">
                    <div class="progress progress-lg rounded-pill">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: 25%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-info" role="progressbar" style="width: 18%" aria-valuenow="18" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-success" role="progressbar" style="width: 22%" aria-valuenow="22" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-warning" role="progressbar" style="width: 16%" aria-valuenow="16" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-danger" role="progressbar" style="width: 19%" aria-valuenow="19" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div><!-- end -->

                <div class="mt-3 pt-2">
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-primary me-2"></i>www.google.com
                            </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">24.58%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-info me-2"></i>www.youtube.com
                            </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">17.51%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-success me-2"></i>www.meta.com
                            </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">23.05%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-warning me-2"></i>www.medium.com
                            </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">12.22%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-danger me-2"></i>Other
                            </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">17.58%</p>
                        </div>
                    </div><!-- end -->
                </div><!-- end -->

            </div><!-- end card body -->
        </div><!-- end card -->
    </div>
</div>

<div class="row mb-4">
    <div class="col-xl-12">
        <div class="card-body bg-white p-3 mb-2">
            <h4 class="card-title">Ranking By Count</h4>
            <hr>
            <div class="table-responsive">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                        <tr>
                            <th style="width: 50px;">Rank</th>
                            <th>Name</th>
                            <th>Picture</th>
                            <th>Achieved Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        if (isset($consultants_count_ranking)) {
                            foreach ($consultants_count_ranking as $key => $count_ranking) { ?>
                                <tr>
                                    <td><?= $key + 1 ?></td>
                                    <td><?= $count_ranking['name'] ?? '' ?></td>
                                    <td>
                                        <?php if (!empty($count_ranking['profile_picture'])): ?>
                                            <img src="<?= base_url(get_file($count_ranking['profile_picture'])) ?>" alt="Profile Picture" width="50" height="50">
                                        <?php endif; ?>
                                    </td>
                                    <td><?= $count_ranking['achievedCounts'] ?? '' ?></td>
                                </tr>
                        <?php }
                        }
                        ?>
                    </tbody>

                </table>
            </div>
        </div>
    </div>

</div>




<script src="<?= base_url() ?>assets/app/libs/apexcharts/apexcharts.min.js"></script>
<script src="<?= base_url() ?>assets/app/libs/jsvectormap/js/jsvectormap.min.js"></script>
<script src="<?= base_url() ?>assets/app/libs/jsvectormap/maps/world-merc.js"></script>

<script>
    function getChartColorsArray(chartId) {
        if (document.getElementById(chartId) !== null) {
            var colors = document.getElementById(chartId).getAttribute("data-colors");
            if (colors) {
                colors = JSON.parse(colors);
                return colors.map(function(value) {
                    var newValue = value.replace(" ", "");
                    if (newValue.indexOf(",") === -1) {
                        var color = getComputedStyle(document.documentElement).getPropertyValue(newValue);
                        if (color) return color;
                        else return newValue;;
                    } else {
                        var val = value.split(',');
                        if (val.length == 2) {
                            var rgbaColor = getComputedStyle(document.documentElement).getPropertyValue(val[0]);
                            rgbaColor = "rgba(" + rgbaColor + "," + val[1] + ")";
                            return rgbaColor;
                        } else {
                            return newValue;
                        }
                    }
                });
            } else {
                console.warn('data-colors Attribute not found on:', chartId);
            }
        }
    }

    // Projects Overview
    var linechartcustomerColors = getChartColorsArray("projects-overview-chart");
    if (linechartcustomerColors) {
        var options = {
            series: [{
                name: 'Achieved Target',
                type: 'bar',
                data: <?= json_encode($achievedPointsChart) ?>
            }, {
                name: 'Target Point',
                type: 'area',
                data: <?= json_encode($targetPointsChart) ?>
            }],
            chart: {
                height: 374,
                type: 'line',
                toolbar: {
                    show: false,
                }
            },
            stroke: {
                curve: 'smooth',
                dashArray: [0, 3, 0],
                width: [0, 1, 0],
            },
            fill: {
                opacity: [1, 0.1, 1]
            },
            markers: {
                size: [0, 4, 0],
                strokeWidth: 2,
                hover: {
                    size: 4,
                }
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                axisTicks: {
                    show: false
                },
                axisBorder: {
                    show: false
                }
            },
            grid: {
                show: true,
                xaxis: {
                    lines: {
                        show: true,
                    }
                },
                yaxis: {
                    lines: {
                        show: false,
                    }
                },
                padding: {
                    top: 0,
                    right: -2,
                    bottom: 15,
                    left: 10
                },
            },
            legend: {
                show: true,
                horizontalAlign: 'center',
                offsetX: 0,
                offsetY: -5,
                markers: {
                    width: 9,
                    height: 9,
                    radius: 6,
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 0
                },
            },
            plotOptions: {
                bar: {
                    columnWidth: '30%',
                    barHeight: '70%'
                }
            },
            colors: linechartcustomerColors,
            tooltip: {
                shared: true,
                y: [{
                    formatter: function(y) {
                        if (typeof y !== "undefined") {
                            return y.toFixed(0);
                        }
                        return y;

                    }
                }, {
                    formatter: function(y) {
                        if (typeof y !== "undefined") {
                            return y.toFixed(0);
                        }
                        return y;

                    }
                }, ]
            }
        };
        var chart = new ApexCharts(document.querySelector("#projects-overview-chart"), options);
        chart.render();
    }


    //------------------------------------------------ Worldmap ---------------------------------------------
    var worldemapmarkers = "";

    function loadCharts() {
        // world map with markers
        var vectorMapWorldMarkersColors = getChartColorsArray("students-by-locations");
        if (vectorMapWorldMarkersColors) {
            document.getElementById("students-by-locations").innerHTML = "";
            worldemapmarkers = "";
            worldemapmarkers = new jsVectorMap({
                map: "world_merc",
                selector: "#students-by-locations",
                zoomOnScroll: false,
                zoomButtons: false,
                selectedMarkers: [0, 5],
                regionStyle: {
                    initial: {
                        stroke: "#9599ad",
                        strokeWidth: 0.25,
                        fill: vectorMapWorldMarkersColors[0],
                        fillOpacity: 1,
                    },
                },
                markersSelectable: true,
                markers: [{
                        name: "India",
                        coords: [20.5937, 78.9629],
                    }

                ],
                markerStyle: {
                    initial: {
                        fill: vectorMapWorldMarkersColors[1],
                    },
                    selected: {
                        fill: vectorMapWorldMarkersColors[2],
                    },
                },
                labels: {
                    markers: {
                        render: function(marker) {
                            return marker.name;
                        },
                    },
                },
            });
        }
    }

    window.onresize = function() {
        setTimeout(() => {
            loadCharts();
        }, 0);
    };

    loadCharts();
</script>

<script>
    var options = {
        series: [2,4,56,9,2],
        chart: {
            height: 350,
            type: 'radialBar',
        },
        plotOptions: {
            radialBar: {
                hollow: {
                    margin: 15,
                    size: '70%',
                },
                track: {
                    background: '#f2f2f2',
                },
                dataLabels: {
                    name: {
                        offsetY: -10,
                        show: true,
                        color: '#888',
                        fontSize: '14px'
                    },
                    value: {
                        color: '#111',
                        fontSize: '30px',
                        show: true,
                        formatter: function(val) {
                            return val + '%';
                        }
                    }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#4096ff'],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            },
        },
        stroke: {
            lineCap: 'round'
        },
        labels: ['Percent'],
    };

    // Create the chart
    var chart = new ApexCharts(document.querySelector("#achived_point_radialbar"), options);
    chart.render();
</script>

<!------------------------------------------------ Course chart --------------------------------------------->
<script>
    // Dummy data
        var courseData = [
            { title: "Math", month: "Jan", course_count: 10 },
            { title: "Math", month: "Feb", course_count: 15 },
            { title: "Science", month: "Jan", course_count: 5 },
            { title: "Science", month: "Feb", course_count: 12 },
            { title: "English", month: "Jan", course_count: 7 },
        ];

        // Dummy color array
        var chartColumnStackedColors = ["#556ee6", "#34c38f", "#f46a6a"];

        // Extract unique months
        var months = [...new Set(courseData.map(item => item.month))];

        // Extract unique course titles
        var courseNames = [...new Set(courseData.map(item => item.title))];

        // Prepare series data
        var seriesData = courseNames.map(course => {
            return {
                name: course,
                data: months.map(month => {
                    var found = courseData.find(item => item.title === course && item.month === month);
                    return found ? parseInt(found.course_count) : 0;
                })
            };
        });

        // Chart config
        var options = {
            chart: {
                type: 'bar',
                height: 400,
                stacked: true
            },
            colors: chartColumnStackedColors,
            plotOptions: {
                bar: {
                    horizontal: false
                }
            },
            xaxis: {
                categories: months
            },
            legend: {
                position: 'top'
            },
            series: seriesData
        };

        // Render chart
        var chart = new ApexCharts(document.querySelector("#cousre_column_stacked"), options);
        chart.render();

        var options = {
            series: seriesData,
            chart: {
                type: 'bar',
                height: 350,
                stacked: true, // Enable stacking
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: true
                }
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    legend: {
                        position: 'bottom',
                        offsetX: -10,
                        offsetY: 0
                    }
                }
            }],
            plotOptions: {
                bar: {
                    horizontal: false,
                    borderRadius: 10
                },
            },
            xaxis: {
                categories: months // Set months as x-axis labels
            },
            legend: {
                position: 'right',
                offsetY: 40
            },
            fill: {
                opacity: 1
            },
            colors: chartColumnStackedColors,
        };

        var chart = new ApexCharts(document.querySelector("#cousre_column_stacked"), options);
        chart.render();
    }
</script>

<!------------------------------------------------ student gender chart --------------------------------------------->
<script>
    document.addEventListener("DOMContentLoaded", function () {
            // Dummy student gender data
            var genderData = {
                Male: 120,
                Female: 90,
                Other: 10
            };

            var options = {
                series: Object.values(genderData),
                labels: Object.keys(genderData),
                chart: {
                    type: 'pie',
                    height: 350
                },
                colors: ['#FF4444', '#4CAF50', '#FFEB3B'],
                legend: {
                    position: 'bottom'
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }]
            };

            var chart = new ApexCharts(document.querySelector("#gender_pie_chart"), options);
            chart.render();
        });

        var chart = new ApexCharts(document.querySelector("#gender_chart"), options);
        chart.render();
    });
</script>


<!----------------------------------------------------- sourse chart --------------------------------------------->
<script>
    document.addEventListener("DOMContentLoaded", function () {
            // Dummy source data and colors
            var sourceData = {
                Facebook: 50,
                Google: 30,
                LinkedIn: 20
            };

            var sourceColors = {
                Facebook: "#3b5998",
                Google: "#db4437",
                LinkedIn: "#0077b5"
            };

            var sourceLabels = Object.keys(sourceData);
            var sourceSeries = Object.values(sourceData);
            var chartColors = sourceLabels.map(function (label) {
                return sourceColors[label] || "#ccc";
            });

            var options = {
                series: sourceSeries,
                labels: sourceLabels,
                chart: {
                    type: "donut",
                    height: 219,
                },
                plotOptions: {
                    pie: {
                        size: 100,
                        donut: {
                            size: "76%",
                        },
                    },
                },
                dataLabels: {
                    enabled: false,
                },
                legend: {
                    show: false,
                    position: "bottom",
                    horizontalAlign: "center",
                    offsetX: 0,
                    offsetY: 0,
                    markers: {
                        width: 20,
                        height: 6,
                        radius: 2,
                    },
                    itemMargin: {
                        horizontal: 12,
                        vertical: 0,
                    },
                },
                stroke: {
                    width: 0,
                },
                colors: chartColors
            };

            var chart = new ApexCharts(document.querySelector("#source_donut_chart"), options);
            chart.render();
        });

    var chart = new ApexCharts(
        document.querySelector("#sourse_pie_charts"),
        options
    );
    chart.render();
</script>