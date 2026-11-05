import Image from 'next/image';
import registerShot from '../../../../../public/screens/register-company.png';
import requestsShot from '../../../../../public/screens/network-requests.png';
import RfqTimeline from './RfqTimeline';
import TripTable from './TripTable';

// The five stages a company goes through, each with the real screen or its own ledger.
export default function Stages() {
    return (
        <section className="container mk-section" id="stages" aria-label="The five stages">
            <div className="mk-stages">
                <section className="mk-stage" id="stage-1" aria-labelledby="stage-1-title">
                    <div className="mk-stage__text">
                        <h2 id="stage-1-title">1. Register with GST and PAN</h2>
                        <p className="lead">
                            Company, branch, then documents. Shippers and transporters give GST and
                            PAN; brokers and fleet owners, PAN.
                        </p>
                    </div>
                    <figure className="mk-stage__object mk-shot">
                        <div className="mk-ticks">
                            <Image
                                src={registerShot}
                                alt="The company step of registration: name, type, email, phone, GST and PAN"
                                sizes="(min-width: 60rem) 58vw, 100vw"
                            />
                        </div>
                        <figcaption className="mk-caption">
                            The company step. Branch and documents follow.
                        </figcaption>
                    </figure>
                </section>

                <section className="mk-stage mk-stage--narrow" id="stage-2" aria-labelledby="stage-2-title">
                    <div className="mk-stage__text">
                        <h2 id="stage-2-title">2. A person approves it</h2>
                        <p className="lead">
                            No company logs in until EnrouteLogtek has checked its papers.
                        </p>
                    </div>
                    <div className="mk-stage__object">
                        <dl className="mk-ledger mk-well mk-ticks">
                            <div>
                                <dt>Draft</dt>
                                <dd>Your company, branch and documents are saved as you go.</dd>
                            </div>
                            <div>
                                <dt>Pending</dt>
                                <dd>Submitted. EnrouteLogtek checks the GST and PAN documents by hand.</dd>
                            </div>
                            <div>
                                <dt data-current="true">Approved</dt>
                                <dd>You can log in and start connecting.</dd>
                            </div>
                            <div>
                                <dt>Rejected</dt>
                                <dd>You get the reason by email.</dd>
                            </div>
                        </dl>
                        <p className="mk-caption">Company status, as the app records it.</p>
                    </div>
                </section>

                <section className="mk-stage mk-stage--wide" id="stage-3" aria-labelledby="stage-3-title">
                    <div className="mk-stage__text">
                        <h2 id="stage-3-title">3. Connect with carriers you choose</h2>
                        <p className="lead">
                            Find transporters, brokers and fleet owners by name or Enroute ID. Work
                            starts when both sides accept.
                        </p>
                    </div>
                    <figure className="mk-stage__object mk-shot">
                        <div className="mk-ticks">
                            <Image
                                src={requestsShot}
                                alt="Connection requests received by a shipper, each with the carrier's type and Enroute ID and the buttons to accept, reject or block"
                                sizes="(min-width: 90rem) 1312px, 100vw"
                            />
                        </div>
                        <figcaption className="mk-caption">
                            Requests received by a shipper: the carrier&apos;s type, its Enroute ID,
                            and when it asked.
                        </figcaption>
                    </figure>
                </section>

                <section className="mk-stage" id="stage-4" aria-labelledby="stage-4-title">
                    <div className="mk-stage__text">
                        <h2 id="stage-4-title">4. Post an RFQ, take the bids</h2>
                        <p className="lead">
                            Only your connected carriers see it. Up to five bids inside the window,
                            on a clock.
                        </p>
                    </div>
                    <div className="mk-stage__object">
                        <RfqTimeline />
                    </div>
                </section>

                <section className="mk-stage mk-stage--wide" id="stage-5" aria-labelledby="stage-5-title">
                    <div className="mk-stage__text">
                        <h2 id="stage-5-title">5. Award, dispatch, upload the POD</h2>
                        <p className="lead">
                            One record from the winning bid to the signed proof of delivery.
                        </p>
                    </div>
                    <div className="mk-stage__object">
                        <TripTable />
                    </div>
                </section>
            </div>
        </section>
    );
}
